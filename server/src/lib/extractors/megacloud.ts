import axios from "axios";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import * as cheerio from "cheerio";
import { getSources } from "./megacloud.getsrcs.js";
import extractToken, { decryptSrc2, getMegaCloudClientKey } from "./utils/index.js";

// https://megacloud.tv/embed-2/e-1/dBqCr5BcOhnD?k=1

const megacloud = {
  script: "https://megacloud.tv/js/player/a/prod/e1-player.min.js?v=",
  sources: "https://megacloud.tv/embed-2/ajax/e-1/getSources?id=",
} as const;

// extract7 constants
const EXTRACT7_CONFIG = {
  MAX_RETRIES: 2,
  TIMEOUT: 15000,
  KEY_CACHE_DURATION: 60 * 60 * 1000, // 1 hour
  KEY_URL: "https://raw.githubusercontent.com/ryanwtf88/megacloud-keys/refs/heads/master/key.txt",
  FALLBACK_PROVIDERS: [
    { name: "megaplay", domain: "megaplay.buzz" },
    { name: "vidwish", domain: "vidwish.live" },
  ],
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  BASE_URL: "https://hianime.to",
} as const;

// Key cache for extract7
let cachedKey: string | null = null;
let keyLastFetched = 0;

export type track = {
  file: string;
  kind: string;
  label?: string;
  default?: boolean;
};

type intro_outro = {
  start: number;
  end: number;
};

export type unencryptedSrc = {
  file: string;
  type: string;
};

export type extractedSrc = {
  sources: string | unencryptedSrc[];
  tracks: track[];
  encrypted: boolean;
  intro: intro_outro;
  outro: intro_outro;
  server: number;
};

type ExtractedData = Pick<extractedSrc, "intro" | "outro" | "tracks"> & {
  sources: { url: string; type: string }[];
};

class MegaCloud {
  // private serverName = "megacloud";

  async extract(videoUrl: URL) {
    try {
      const extractedData: ExtractedData = {
        tracks: [],
        intro: {
          start: 0,
          end: 0,
        },
        outro: {
          start: 0,
          end: 0,
        },
        sources: [],
      };

      const videoId = videoUrl?.href?.split("/")?.pop()?.split("?")[0];
      const { data: srcsData } = await axios.get<extractedSrc>(
        megacloud.sources.concat(videoId || ""),
        {
          headers: {
            Accept: "*/*",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            Referer: videoUrl.href,
          },
        }
      );
      if (!srcsData) {
        throw new Error("Url may have an invalid video id");
      }

      // console.log(JSON.stringify(srcsData, null, 2));

      const encryptedString = srcsData.sources;
      if (!srcsData.encrypted && Array.isArray(encryptedString)) {
        extractedData.intro = srcsData.intro;
        extractedData.outro = srcsData.outro;
        extractedData.tracks = srcsData.tracks;
        extractedData.sources = encryptedString.map((s) => ({
          url: s.file,
          type: s.type,
        }));

        return extractedData;
      }

      let text: string;
      const { data } = await axios.get(
        megacloud.script.concat(Date.now().toString())
      );

      text = data;
      if (!text) {
        throw new Error("Couldn't fetch script to decrypt resource");
      }

      const vars = this.extractVariables(text);
      if (!vars.length) {
        throw new Error(
          "Can't find variables. Perhaps the extractor is outdated."
        );
      }

      const { secret, encryptedSource } = this.getSecret(
        encryptedString as string,
        vars
      );
      const decrypted = this.decrypt(encryptedSource, secret);
      try {
        console.log(decrypted);
        const sources = JSON.parse(decrypted);
        extractedData.intro = srcsData.intro;
        extractedData.outro = srcsData.outro;
        extractedData.tracks = srcsData.tracks;
        extractedData.sources = sources.map((s: any) => ({
          url: s.file,
          type: s.type,
        }));

        return extractedData;
      } catch (error) {
        throw new Error("Failed to decrypt resource");
      }
    } catch (err) {
      // console.log(err);
      throw err;
    }
  }

  private extractVariables(text: string) {
    // copied from github issue #30 'https://github.com/ghoshRitesh12/aniwatch-api/issues/30'
    const regex =
      /case\s*0x[0-9a-f]+:(?![^;]*=partKey)\s*\w+\s*=\s*(\w+)\s*,\s*\w+\s*=\s*(\w+);/g;
    const matches = text.matchAll(regex);
    const vars = Array.from(matches, (match) => {
      const matchKey1 = this.matchingKey(match[1], text);
      const matchKey2 = this.matchingKey(match[2], text);
      try {
        return [parseInt(matchKey1, 16), parseInt(matchKey2, 16)];
      } catch (e) {
        return [];
      }
    }).filter((pair) => pair.length > 0);

    return vars;
  }

  private getSecret(encryptedString: string, values: number[][]) {
    let secret = "",
      encryptedSource = "",
      encryptedSourceArray = encryptedString.split(""),
      currentIndex = 0;

    for (const index of values) {
      const start = index[0] + currentIndex;
      const end = start + index[1];

      for (let i = start; i < end; i++) {
        secret += encryptedString[i];
        encryptedSourceArray[i] = "";
      }
      currentIndex += index[1];
    }

    encryptedSource = encryptedSourceArray.join("");

    return { secret, encryptedSource };
  }

  private decrypt(encrypted: string, keyOrSecret: string, maybe_iv?: string) {
    let key;
    let iv;
    let contents;
    if (maybe_iv) {
      key = keyOrSecret;
      iv = maybe_iv;
      contents = encrypted;
    } else {
      // copied from 'https://github.com/brix/crypto-js/issues/468'
      const cypher = Buffer.from(encrypted, "base64");
      const salt = cypher.subarray(8, 16);
      const password = Buffer.concat([
        Buffer.from(keyOrSecret, "binary"),
        salt,
      ]);
      const md5Hashes = [];
      let digest = password;
      for (let i = 0; i < 3; i++) {
        md5Hashes[i] = crypto.createHash("md5").update(digest).digest();
        digest = Buffer.concat([md5Hashes[i], password]);
      }
      key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
      iv = md5Hashes[2];
      contents = cypher.subarray(16);
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted =
      decipher.update(
        contents as any,
        typeof contents === "string" ? "base64" : undefined,
        "utf8"
      ) + decipher.final();

    return decrypted;
  }

  // function copied from github issue #30 'https://github.com/ghoshRitesh12/aniwatch-api/issues/30'
  private matchingKey(value: string, script: string) {
    const regex = new RegExp(`,${value}=((?:0x)?([0-9a-fA-F]+))`);
    const match = script.match(regex);
    if (match) {
      return match[1].replace(/^0x/, "");
    } else {
      throw new Error("Failed to match the key");
    }
  }

  // https://megacloud.tv/embed-2/e-1/1hnXq7VzX0Ex?k=1
  async extract2(embedIframeURL: URL): Promise<ExtractedData> {
    try {
      const extractedData: ExtractedData = {
        tracks: [],
        intro: {
          start: 0,
          end: 0,
        },
        outro: {
          start: 0,
          end: 0,
        },
        sources: [],
      };

      const xrax = embedIframeURL.pathname.split("/").pop() || "";

      const resp = await getSources(xrax);
      if (!resp) return extractedData;

      if (Array.isArray(resp.sources)) {
        extractedData.sources = resp.sources.map((s) => ({
          url: s.file,
          type: s.type,
        }));
      }
      extractedData.intro = resp.intro ? resp.intro : extractedData.intro;
      extractedData.outro = resp.outro ? resp.outro : extractedData.outro;
      extractedData.tracks = resp.tracks;

      return extractedData;
    } catch (err) {
      throw err;
    }
  }

  async extract5(embedIframeURL: URL): Promise<ExtractedData> {
    console.log("new extraction used");
    try {
      // this key is extracted the same way as extract3's key
      const response = await axios.get(
        "https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json"
      );
      const key = response.data;
      const megacloudKey = key["mega"];
      const extractedData: ExtractedData = {
        tracks: [],
        intro: {
          start: 0,
          end: 0,
        },
        outro: {
          start: 0,
          end: 0,
        },
        sources: [],
      };

      const match = /\/([^\/\?]+)\?/.exec(embedIframeURL.href);

      const sourceId = match?.[1];

      console.log("SOURCE ID HERE", sourceId);
      if (!sourceId)
        throw new Error("Unable to extract sourceId from embed URL");

      const baseUrlMatch = embedIframeURL.href.match(
        /^(https?:\/\/[^/]+(?:\/[^/]+){3})/
      );
      if (!baseUrlMatch)
        throw new Error("Could not extract base URL from ajaxLink");
      const baseUrl = baseUrlMatch[1];

      console.log("BASE URL", baseUrl);

      const clientKey = await extractToken(
        `${baseUrl}/${sourceId}?k=1&autoPlay=0&oa=0&asi=1`
      ) as string;

	  console.log("EXTRACTED TOKEN", clientKey);

      // added gathering the client key
    //   const clientKey = await getMegaCloudClientKey(sourceId);
      if (!clientKey)
        throw new Error("Unable to extract client key from iframe");

      console.log("CLIENT KEY HERE", clientKey);
      // endpoint changed
      const megacloudUrl = `https://megacloud.blog/embed-2/v3/e-1/getSources?id=${sourceId}&_k=${clientKey}`;
      const { data: rawSourceData } = await axios.get(megacloudUrl);
      let decryptedSources;
      if (!rawSourceData?.encrypted) {
        decryptedSources = rawSourceData?.sources;
        console.log("EASY DESCRYPT", clientKey);
      } else {
        const encrypted = rawSourceData?.sources;
        if (!encrypted) throw new Error("Encrypted source missing in response");
        console.log(clientKey, megacloudKey, encrypted);

        const decrypted = decryptSrc2(encrypted, clientKey, megacloudKey);

        try {
          decryptedSources = JSON.parse(decrypted);
        } catch (e) {
          throw new Error("Decrypted data is not valid JSON");
        }
      }
      extractedData.tracks = rawSourceData.tracks;
      extractedData.intro = rawSourceData.intro;
      extractedData.outro = rawSourceData.outro;
      extractedData.intro = rawSourceData.intro
        ? rawSourceData.intro
        : extractedData.intro;
      extractedData.outro = rawSourceData.outro
        ? rawSourceData.outro
        : extractedData.outro;

      extractedData.tracks =
        rawSourceData.tracks?.map((track: any) => ({
          url: track.file,
          lang: track.label ? track.label : track.kind,
        })) || [];
      extractedData.sources = decryptedSources.map((s: any) => ({
        url: s.file,
        isM3U8: s.type === "hls",
        type: s.type,
      }));

      return extractedData;
    } catch (err) {
      throw err;
    }
  }

  async extract6(embedIframeURL: URL): Promise<ExtractedData> {
    console.log("extract6 (crawlr.cc) used");
    try {
      const extractedData: ExtractedData = {
        tracks: [],
        intro: {
          start: 0,
          end: 0,
        },
        outro: {
          start: 0,
          end: 0,
        },
        sources: [],
      };

      // Make request to crawlr.cc endpoint with embed URL as parameter
      const crawlrUrl = `https://crawlr.cc/9D7F1B3E8?url=${encodeURIComponent(embedIframeURL.href)}`;

      console.log("Fetching from crawlr.cc:", crawlrUrl);

      const { data: rawData } = await axios.get(crawlrUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        },
      });

      if (!rawData) {
        throw new Error("No data received from crawlr.cc");
      }

      console.log("Received data from crawlr.cc");


      // Map sources to the expected format
      extractedData.sources = rawData.sources?.map((s: any) => ({
        url: s.url,
        isM3U8: s.url?.includes(".m3u8") || s.quality === "auto",
        type: s.url?.includes(".m3u8") ? "hls" : "mp4",
        quality: s.quality,
      })) || [];

      // Map tracks to the expected format
      extractedData.tracks = rawData.tracks?.map((track: any) => ({
        url: track.url,
        lang: track.lang || track.label,
        label: track.label,
      })) || [];

      // Set intro/outro if provided
      extractedData.intro = rawData.intro || { start: 0, end: 0 };
      extractedData.outro = rawData.outro || { start: 0, end: 0 };

      return extractedData;
    } catch (err: any) {
      console.error("Extract6 error:", err.message);
      throw err;
    }
  }

  /**
   * extract7 - New megacloud extractor with GitHub-hosted key and fallback providers
   * Based on the reference implementation with token extraction and AES decryption
   */
  async extract7(embedIframeURL: URL, retry = 0): Promise<ExtractedData> {
    console.log("extract7 used");
    try {
      const extractedData: ExtractedData = {
        tracks: [],
        intro: { start: 0, end: 0 },
        outro: { start: 0, end: 0 },
        sources: [],
      };

      // Parse the embed URL to get sourceId and baseUrl
      const { sourceId, baseUrl } = this.parseEmbedUrl(embedIframeURL.href);
      console.log("[extract7] sourceId:", sourceId, "baseUrl:", baseUrl);

      // Fetch decryption key and sources in parallel
      const [key] = await Promise.all([this.getDecryptionKey()]);

      let decryptedSources: any[];
      let rawData: any;
      let usedFallback = false;

      try {
        // Try primary source decryption
        const result = await this.decryptPrimarySource7(baseUrl, sourceId, key);
        decryptedSources = result.sources;
        rawData = result.rawData;
      } catch (primaryError: any) {
        console.log("[extract7] Primary source failed:", primaryError.message);
        console.log("[extract7] Trying fallback providers...");

        // Extract episode ID from the URL for fallback
        const epID = embedIframeURL.href.split("ep=").pop() || sourceId;

        // Try fallback providers
        const fallbackResult = await this.getFallbackSource7(epID, "sub", "HD-1");
        decryptedSources = fallbackResult.sources;
        rawData = fallbackResult.rawData;
        usedFallback = true;
      }

      // Validate sources
      if (!decryptedSources?.[0]?.file) {
        throw new Error("Invalid decrypted sources - no file found");
      }

      // Build extracted data
      extractedData.sources = decryptedSources.map((s: any) => ({
        url: s.file,
        type: s.type || "hls",
        isM3U8: s.file?.includes(".m3u8") || s.type === "hls",
      }));

      extractedData.tracks = rawData?.tracks?.map((t: any) => ({
        file: t.file,
        kind: t.kind || "captions",
        label: t.label,
        default: t.default,
      })) || [];

      extractedData.intro = rawData?.intro || { start: 0, end: 0 };
      extractedData.outro = rawData?.outro || { start: 0, end: 0 };

      console.log(`[extract7] Success! ${usedFallback ? "(used fallback)" : "(primary)"}`);
      return extractedData;
    } catch (err: any) {
      console.error("[extract7] Error:", err.message);

      if (retry < EXTRACT7_CONFIG.MAX_RETRIES) {
        console.log(`[extract7] Retrying... (${retry + 1}/${EXTRACT7_CONFIG.MAX_RETRIES})`);
        await this.backoff7(retry);
        return this.extract7(embedIframeURL, retry + 1);
      }

      throw err;
    }
  }

  // =====================
  // extract7 Helper Methods
  // =====================

  private parseEmbedUrl(url: string): { sourceId: string; baseUrl: string } {
    const sourceIdMatch = /\/([^/?]+)\?/.exec(url);
    const sourceId = sourceIdMatch?.[1];

    const baseUrlMatch = url.match(/^(https?:\/\/[^/]+(?:\/[^/]+){3})/);
    const baseUrl = baseUrlMatch?.[1];

    if (!sourceId || !baseUrl) {
      throw new Error("Invalid embed URL format");
    }

    return { sourceId, baseUrl };
  }

  private async getDecryptionKey(): Promise<string> {
    const now = Date.now();

    // Return cached key if still valid
    if (cachedKey && now - keyLastFetched < EXTRACT7_CONFIG.KEY_CACHE_DURATION) {
      return cachedKey;
    }

    try {
      const { data } = await axios.get(EXTRACT7_CONFIG.KEY_URL, {
        timeout: EXTRACT7_CONFIG.TIMEOUT,
      });
      cachedKey = data.trim();
      keyLastFetched = now;
      console.log("[extract7] Decryption key fetched successfully");
      return cachedKey;
    } catch (err: any) {
      console.error("[extract7] Key fetch error:", err.message);
      if (cachedKey) return cachedKey;
      throw new Error("Failed to fetch decryption key");
    }
  }

  private async extractToken7(url: string): Promise<string | null> {
    try {
      const { data: html } = await axios.get(url, {
        timeout: EXTRACT7_CONFIG.TIMEOUT,
        headers: {
          Referer: `${EXTRACT7_CONFIG.BASE_URL}/`,
          "User-Agent": EXTRACT7_CONFIG.USER_AGENT,
          Accept: "text/html",
        },
      });

      const $ = cheerio.load(html);

      // Try multiple extraction methods in priority order

      // 1. Meta tag
      const meta = $('meta[name="_gg_fb"]').attr("content");
      if (meta && meta.length >= 10) return meta;

      // 2. Data attribute
      const dpi = $("[data-dpi]").attr("data-dpi");
      if (dpi && dpi.length >= 10) return dpi;

      // 3. Nonce from script
      const nonce = $("script[nonce]")
        .map((_, el) => $(el).attr("nonce"))
        .get()
        .find((n) => n && n.length >= 10);
      if (nonce) return nonce;

      // 4. Window string assignments
      const stringRegex = /window\.\w+\s*=\s*["']([a-zA-Z0-9_-]{10,})["']/g;
      for (const match of html.matchAll(stringRegex)) {
        if (match[1]?.length >= 10) return match[1];
      }

      // 5. Window object assignments
      const objectRegex = /window\.\w+\s*=\s*(\{[\s\S]*?\});/g;
      for (const match of html.matchAll(objectRegex)) {
        try {
          const obj = new Function(`return ${match[1]}`)();
          if (obj && typeof obj === "object") {
            const joined = Object.values(obj)
              .filter((v) => typeof v === "string")
              .join("");
            if (joined.length >= 20) return joined;
          }
        } catch {
          continue;
        }
      }

      // 6. HTML comments
      let commentToken: string | null = null;
      $("*")
        .contents()
        .each((_, node: any) => {
          if (node.type === "comment") {
            const match = node.data?.trim().match(/(?:_is_th|token|key):([a-zA-Z0-9_-]{10,})/);
            if (match) {
              commentToken = match[1];
              return false;
            }
          }
        });
      if (commentToken) return commentToken;

      throw new Error("No token found in page");
    } catch (err: any) {
      console.error("[extract7] Token extraction error:", err.message);
      return null;
    }
  }

  private async decryptPrimarySource7(
    baseUrl: string,
    sourceId: string,
    key: string
  ): Promise<{ sources: any[]; rawData: any }> {
    // Extract token from embed page
    const tokenUrl = `${baseUrl}/${sourceId}?k=1&autoPlay=0&oa=0&asi=1`;
    const token = await this.extractToken7(tokenUrl);

    if (!token) {
      throw new Error("Token extraction failed");
    }

    console.log("[extract7] Token extracted:", token.substring(0, 10) + "...");

    // Fetch sources with token
    const sourcesUrl = `${baseUrl}/getSources?id=${sourceId}&_k=${token}`;
    const { data } = await axios.get(sourcesUrl, {
      timeout: EXTRACT7_CONFIG.TIMEOUT,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${baseUrl}/${sourceId}`,
        "User-Agent": EXTRACT7_CONFIG.USER_AGENT,
      },
    });

    const encrypted = data?.sources;
    if (!encrypted) {
      throw new Error("Missing encrypted sources in response");
    }

    // If sources are not encrypted, return directly
    if (typeof encrypted !== "string") {
      return { sources: encrypted, rawData: data };
    }

    // Decrypt using AES
    const decrypted = this.decryptAES7(encrypted, key);
    return { sources: decrypted, rawData: data };
  }

  private decryptAES7(encrypted: string, key: string): any[] {
    // Try decryption with string key first
    let decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);

    // If that fails, try with hex-parsed key
    if (!decrypted) {
      decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(key)).toString(
        CryptoJS.enc.Utf8
      );
    }

    if (!decrypted) {
      throw new Error("AES decryption failed");
    }

    return JSON.parse(decrypted);
  }

  private async getFallbackSource7(
    epID: string,
    type: string,
    serverName: string
  ): Promise<{ sources: any[]; rawData: any }> {
    // Prioritize fallback based on server name
    const providers = this.prioritizeFallback7(serverName);

    for (const provider of providers) {
      try {
        console.log(`[extract7] Trying fallback: ${provider.name}`);

        // Fetch fallback HTML
        const { data: html } = await axios.get(
          `https://${provider.domain}/stream/s-2/${epID}/${type}`,
          {
            timeout: EXTRACT7_CONFIG.TIMEOUT,
            headers: {
              Referer: `https://${provider.domain}/`,
              "User-Agent": EXTRACT7_CONFIG.USER_AGENT,
            },
          }
        );

        // Extract data-id from HTML
        const dataIdMatch = html.match(/data-id=["'](\d+)["']/);
        const realId = dataIdMatch?.[1];

        if (!realId) {
          console.log(`[extract7] No data-id found for ${provider.name}`);
          continue;
        }

        // Fetch sources from fallback
        const { data } = await axios.get(
          `https://${provider.domain}/stream/getSources?id=${realId}`,
          {
            timeout: EXTRACT7_CONFIG.TIMEOUT,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              Referer: `https://${provider.domain}/`,
            },
          }
        );

        if (data?.sources?.file) {
          console.log(`[extract7] Fallback ${provider.name} succeeded`);
          return {
            sources: [{ file: data.sources.file }],
            rawData: data,
          };
        }
      } catch (err: any) {
        console.log(`[extract7] Fallback ${provider.name} failed:`, err.message);
        continue;
      }
    }

    throw new Error("All fallback providers failed");
  }

  private prioritizeFallback7(serverName: string): Array<{ name: string; domain: string }> {
    const providers = [...EXTRACT7_CONFIG.FALLBACK_PROVIDERS];
    const primary =
      serverName.toLowerCase() === "hd-1" ? providers[0] : providers[1];

    return [primary, ...providers.filter((p) => p !== primary)];
  }

  private backoff7(retry: number): Promise<void> {
    return new Promise((res) => setTimeout(res, 2000 * (retry + 1)));
  }
}

export default MegaCloud;
