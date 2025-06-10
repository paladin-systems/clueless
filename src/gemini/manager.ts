import { GoogleGenAI, Modality, type Session } from "@google/genai";
import type { BrowserWindow } from "electron";
import { bufferToGenAIBlob } from "../audio/utils";
import { geminiLogger } from "../utils/logger";
import {
  HEARTBEAT_INTERVAL_MS,
  SYSTEM_INSTRUCTION,
  getGeminiApiKey,
  getGeminiModel,
  getGeminiTemperature,
} from "./constants";

export class GeminiManager {
  private genAI: GoogleGenAI | null = null;
  private session: Session | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isClosingIntentionally = false;
  private mainWindow: BrowserWindow | null = null;
  private currentResponseText = "";

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;

    const apiKey = getGeminiApiKey();
    geminiLogger.info(
      {
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : "undefined",
        envVar: process.env.GEMINI_API_KEY
          ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...`
          : "undefined",
      },
      "Checking Gemini API key",
    );

    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
      geminiLogger.info("GoogleGenAI client initialized successfully");
    } else {
      geminiLogger.error(
        "Gemini API key not found. Please set the GEMINI_API_KEY environment variable.",
      );
    }
  }

  /**
   * Check if Gemini client is initialized
   */
  public isInitialized(): boolean {
    return this.genAI !== null;
  }

  /**
   * Start a new Gemini Live session
   */
  public async startSession(): Promise<boolean> {
    if (!this.genAI) {
      geminiLogger.error("Gemini AI client not initialized. Cannot start session");
      this.mainWindow?.webContents.send(
        "audio-error",
        "Gemini AI client not initialized (API Key missing?).",
      );
      return false;
    }

    try {
      geminiLogger.info("Starting Gemini Live session");
      this.currentResponseText = "";
      this.isClosingIntentionally = false;

      this.session = await this.genAI.live.connect({
        model: getGeminiModel(),
        config: {
          responseModalities: [Modality.TEXT],
          temperature: getGeminiTemperature(),
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: unknown) => this.handleMessage(message),
          onerror: (error: ErrorEvent) => this.handleError(error),
          onopen: () => this.handleOpen(),
          onclose: (event: CloseEvent) => this.handleClose(event),
        },
      });

      geminiLogger.info("Gemini Live session connect call completed");
      return true;
    } catch (error) {
      geminiLogger.error({ error }, "Failed to start Gemini session");
      return false;
    }
  }

  /**
   * Send audio data to Gemini session
   */
  public sendAudio(audioBuffer: Buffer): void {
    if (!this.session) {
      geminiLogger.warn("No active Gemini session to send audio to");
      return;
    }

    try {
      const audioBlob = bufferToGenAIBlob(audioBuffer, "audio/pcm");
      this.session.sendRealtimeInput({
        media: audioBlob,
      });
    } catch (error) {
      geminiLogger.error({ error }, "Error sending audio to Gemini");
    }
  }

  /**
   * Send image data to Gemini session
   */
  public sendImage(imageBuffer: Buffer): void {
    if (!this.session) {
      geminiLogger.warn("No active Gemini session to send image to");
      return;
    }

    try {
      geminiLogger.info("Sending screenshot to Gemini");
      const imageBlob = bufferToGenAIBlob(imageBuffer, "image/png");
      this.session.sendRealtimeInput({
        media: imageBlob,
      });
    } catch (error) {
      geminiLogger.error({ error }, "Error sending screenshot to Gemini");
    }
  }

  /**
   * Close the Gemini session
   */
  public async closeSession(): Promise<void> {
    this.stopHeartbeat();

    if (this.session) {
      geminiLogger.info("Closing Gemini session intentionally");
      this.isClosingIntentionally = true;
      try {
        await this.session.close();
        geminiLogger.info("Gemini session closed");
      } catch (error) {
        geminiLogger.error({ error }, "Error closing Gemini session");
        this.isClosingIntentionally = false;
      }
      this.session = null;
    }
  }

  /**
   * Start heartbeat to keep session alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.session) {
        try {
          this.session.sendClientContent({ turnComplete: false });
        } catch (error) {
          geminiLogger.warn({ error }, "Error sending heartbeat");
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
        }
      } else {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming messages from Gemini
   */
  private handleMessage(message: unknown): void {
    geminiLogger.debug({ message }, "Received message from Gemini");

    try {
      // Handle text parts from modelTurn
      if (
        typeof message === "object" &&
        message !== null &&
        "serverContent" in message &&
        typeof message.serverContent === "object" &&
        message.serverContent !== null &&
        "modelTurn" in message.serverContent &&
        typeof message.serverContent.modelTurn === "object" &&
        message.serverContent.modelTurn !== null &&
        "parts" in message.serverContent.modelTurn &&
        Array.isArray(message.serverContent.modelTurn.parts) &&
        message.serverContent.modelTurn.parts.length > 0 &&
        "text" in message.serverContent.modelTurn.parts[0] &&
        typeof message.serverContent.modelTurn.parts[0].text === "string"
      ) {
        if (this.currentResponseText === "") {
          this.mainWindow?.webContents.send("gemini-processing-start");
        }
        this.currentResponseText += message.serverContent.modelTurn.parts[0].text;
      }

      // Handle generation complete
      if (
        typeof message === "object" &&
        message !== null &&
        "serverContent" in message &&
        typeof message.serverContent === "object" &&
        message.serverContent !== null &&
        "generationComplete" in message.serverContent &&
        message.serverContent.generationComplete === true
      ) {
        this.processCompleteResponse();
      }

      // Handle turn complete
      if (
        typeof message === "object" &&
        message !== null &&
        "serverContent" in message &&
        typeof message.serverContent === "object" &&
        message.serverContent !== null &&
        "turnComplete" in message.serverContent &&
        message.serverContent.turnComplete === true
      ) {
        this.mainWindow?.webContents.send("gemini-turn-complete");
        if (this.currentResponseText !== "") {
          geminiLogger.warn(
            "Gemini turn completed, but response buffer was not empty. Clearing buffer",
          );
          this.currentResponseText = "";
          this.mainWindow?.webContents.send("gemini-processing-end");
        }
      }

      // Handle errors from Gemini
      if (
        typeof message === "object" &&
        message !== null &&
        "error" in message &&
        typeof message.error === "object" &&
        message.error !== null &&
        "message" in message.error &&
        typeof message.error.message === "string"
      ) {
        geminiLogger.error({ error: message.error }, "Gemini message contained an error");
        this.mainWindow?.webContents.send(
          "audio-error",
          `Gemini error: ${message.error.message || JSON.stringify(message.error)}`,
        );
        this.currentResponseText = "";
        this.mainWindow?.webContents.send("gemini-processing-end");
      }
    } catch (error) {
      geminiLogger.error({ error }, "Error processing Gemini message in onmessage");
      this.mainWindow?.webContents.send(
        "audio-error",
        `Internal error processing Gemini response: ${(error as Error).message}`,
      );
      this.currentResponseText = "";
      this.mainWindow?.webContents.send("gemini-processing-end");
    }
  }

  /**
   * Process complete response from Gemini
   */
  private processCompleteResponse(): void {
    if (!this.currentResponseText) {
      this.mainWindow?.webContents.send("gemini-processing-end");
      return;
    }

    geminiLogger.debug({ response: this.currentResponseText }, "Processing Gemini response");

    let parsedResponse = null;
    let contentToParse = this.currentResponseText.trim();

    // Strategy 1: Try to extract JSON from ```json ... ``` code blocks
    const jsonBlockMatch = this.currentResponseText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
    if (jsonBlockMatch?.[1]) {
      contentToParse = jsonBlockMatch[1].trim();
      geminiLogger.debug({ contentToParse }, "Extracted JSON from code block");
    }

    // Strategy 2: Look for JSON object anywhere in the response
    const jsonObjectMatch = this.currentResponseText.match(/\{[\s\S]*?"category"[\s\S]*?\}/);
    if (!jsonBlockMatch && jsonObjectMatch) {
      contentToParse = jsonObjectMatch[0].trim();
      geminiLogger.debug({ contentToParse }, "Found JSON object in response");
    }

    // Strategy 3: Try to find the first complete JSON object
    if (!jsonBlockMatch && !jsonObjectMatch) {
      const openBrace = this.currentResponseText.indexOf("{");
      if (openBrace !== -1) {
        let braceCount = 0;
        let endPos = openBrace;

        for (let i = openBrace; i < this.currentResponseText.length; i++) {
          if (this.currentResponseText[i] === "{") braceCount++;
          if (this.currentResponseText[i] === "}") braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }

        if (braceCount === 0) {
          contentToParse = this.currentResponseText.substring(openBrace, endPos + 1).trim();
          geminiLogger.debug({ contentToParse }, "Extracted balanced JSON");
        }
      }
    }

    // Try to parse JSON
    try {
      let fixedContentToParse = contentToParse;
      fixedContentToParse = fixedContentToParse.replace(/\\_/g, "_");
      fixedContentToParse = fixedContentToParse.replace(/\\(?!["\\/bfnrt])/g, "");

      const parsedJson = JSON.parse(fixedContentToParse);
      geminiLogger.debug({ parsedJson }, "Parsed JSON");

      if (
        typeof parsedJson === "object" &&
        parsedJson !== null &&
        typeof parsedJson.content === "string" &&
        parsedJson.content.trim().length >= 10
      ) {
        let category = "answer";
        if (
          parsedJson.category &&
          ["answer", "advice", "follow-up"].includes(parsedJson.category)
        ) {
          category = parsedJson.category;
        } else if (parsedJson.advice) {
          category = "advice";
        } else if (parsedJson.followUp || parsedJson["follow-up"]) {
          category = "follow-up";
        }

        geminiLogger.info(
          { parsedJson, derivedCategory: category },
          "Valid structured response, sending",
        );
        parsedResponse = {
          content: parsedJson.content,
          category: category,
          timestamp: Date.now(),
        };
      } else {
        geminiLogger.warn(
          {
            contentLength: parsedJson?.content?.trim().length,
            category: parsedJson?.category,
            hasAdviceField: !!parsedJson?.advice,
            parsedJson: parsedJson,
          },
          "JSON structure validation failed, expected fields missing, invalid, or content too short",
        );
      }
    } catch (parseError) {
      geminiLogger.debug({ parseError, contentToParse }, "JSON parsing failed even after fixes");
    }

    // Send response or fallback to plain text
    if (parsedResponse) {
      this.mainWindow?.webContents.send("gemini-response", parsedResponse);
    } else {
      this.handleFallbackResponse();
    }

    this.currentResponseText = "";
    this.mainWindow?.webContents.send("gemini-processing-end");
  }

  /**
   * Handle fallback response when JSON parsing fails
   */
  private handleFallbackResponse(): void {
    let cleanContent = this.currentResponseText;
    cleanContent = cleanContent.replace(/```json\s*\n?|```\s*\n?/g, "").trim();

    if (cleanContent.includes('"content"') && cleanContent.includes('"category"')) {
      try {
        const contentMatch = cleanContent.match(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (contentMatch?.[1]) {
          cleanContent = contentMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\_/g, "_")
            .replace(/\\(?!["\\/bfnrt])/g, "");
          geminiLogger.debug({ cleanContent }, "Extracted and cleaned content from JSON-like text");
        }
      } catch (_e) {
        geminiLogger.debug("Failed to extract content from JSON-like text");
      }
    }

    const trimmedContent = cleanContent.trim();
    if (trimmedContent && trimmedContent !== "{}" && trimmedContent.length >= 10) {
      geminiLogger.info({ cleanContent }, "Sending as plain text response");
      this.mainWindow?.webContents.send("gemini-response", {
        content: cleanContent,
        category: "answer",
        timestamp: Date.now(),
      });
    } else {
      geminiLogger.debug(
        { cleanContent, contentLength: trimmedContent.length },
        "Skipping empty, invalid, or too short response",
      );
    }
  }

  /**
   * Handle session errors
   */
  private handleError(error: ErrorEvent): void {
    geminiLogger.error({ error }, "Gemini session error (onerror callback)");
    this.mainWindow?.webContents.send(
      "audio-error",
      `Gemini session error: ${error.message || error.error || "Unknown error"}`,
    );
  }

  /**
   * Handle session open
   */
  private handleOpen(): void {
    geminiLogger.info("Gemini session opened successfully");
    this.mainWindow?.webContents.send("audio-status", "Connected to Gemini.");
    this.startHeartbeat();
  }

  /**
   * Handle session close
   */
  private handleClose(event: CloseEvent): void {
    geminiLogger.info({ code: event.code, reason: event.reason }, "Gemini session closed");
    if (!this.isClosingIntentionally) {
      this.mainWindow?.webContents.send(
        "audio-status",
        `Disconnected from Gemini: ${event.reason || "Unknown reason"}`,
      );
    }
    this.isClosingIntentionally = false;
    this.stopHeartbeat();
  }
}
