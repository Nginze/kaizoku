import axios from "axios";
import crypto from "crypto";
import { getSources } from "./megacloud.getsrcs.js";
import extractToken, { decryptSrc2, getMegaCloudClientKey } from "./utils/index.js";

// https://megacloud.tv/embed-2/e-1/dBqCr5BcOhnD?k=1

const megacloud = {
  script: "https://megacloud.tv/js/player/a/prod/e1-player.min.js?v=",
  sources: "https://megacloud.tv/embed-2/ajax/e-1/getSources?id=",
} as const;

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
}

export default MegaCloud;
