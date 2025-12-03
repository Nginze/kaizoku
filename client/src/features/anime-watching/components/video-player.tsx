import React from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

type PlayerProps = {};

export const Player: React.FC<PlayerProps> = () => {
  // Original video URL
  const originalVideoUrl =
    "https://douvid.xyz/_v1_douvid/DnxdVwUQN8hpvrKtkv+o45N2TRyWMuC9472yqVwpWqs=/1aD58-WfZZNJKe6XAw.m3u8";
  // "https://frostbite27.pro/_v7/984773c4852fd5ba3284edb065e44679ee3d11467608bdda79f2de42ed0e714dde623a073f0269d0bb9774686bb8b88263cbc8c923546530af2d28b8a3a5f9dd7e2befb6dbbc57f98b181fc62edf2719957f9f74033fb2a966b80116b8d276f4ca1c4dbc4d1057fa65d937c950a58898b3791557f176b504f1a151fe922be7c6/master.m3u8";
  // "https://douvid.xyz/_v1_douvid/OBrpthndlmFJeUYIw7xnTTO1OB4ZaxESLAVpT2524NU=/2H23PyIbR_5pen2mI8.m3u8";
  // "https://sunshinerays93.live/_v7/0e98070f56e943c33f1ec2ddd1b9dd03974caf33c918651838963c514582602b22bfd0e19bf658e755c9e36fba6f2b71b022483093ed62debb3671acf827732fb107bbdadbd8b424666d444effa391c6579fd3d145b00df15862e4e38626ae77002ec19962eca5d4dd747eeae09c8b1c85074e180bf90ace7df7b5e31ea42f21/master.m3u8";
  // "https://thunderwave48.xyz/_v7/35229c723a1215e3fb9adbc44d72740a7fa59d8b430296e84cfa6bed416a17a7ce848aca1e61bd844d798d7e950b30a7929dbec850d38f6672ed088966b6bb8eceab18c6e0e19709e51b1548962657b21039ac96568f85d1e35e44945a966ec91badd978b3afcd85b503e3039a99478afc11cd5a72345494a6c409f0ac17ab4f/master.m3u8";

  // Proxy URL through backend
  const proxyUrl = `http://localhost:8080/api/proxy/video?url=${encodeURIComponent(
    originalVideoUrl
  )}`;

  return (
    <>
      <MediaPlayer
        crossorigin
        playsinline
        aspectRatio="16/9"
        load="eager"
        posterLoad="eager"
        streamType="on-demand"
        storage="storage-key"
        keyTarget="player"
        src={{
          src: proxyUrl,
          type: "application/x-mpegurl",
        }}
      >
        <MediaProvider />
        <DefaultVideoLayout
          thumbnails="https://s.megastatics.com/thumbnails/d60530447d09b5b21e590776048d0284/thumbnails.vtt"
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </>
  );
};
