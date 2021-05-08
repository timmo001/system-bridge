import React, { ReactElement, useEffect, useState } from "react";
import { ButtonBase, Fade } from "@material-ui/core";
import { Close, Minimize } from "@material-ui/icons";

import { PlayerProvider } from "./Utils";
import Player from "./Player";

function PlayerContainer(): ReactElement {
  const [entered, setEntered] = useState<boolean>(false);

  useEffect(() => {
    document.addEventListener("mouseenter", () => setEntered(true));
    document.addEventListener("mouseleave", () => setEntered(false));
  }, []);

  return (
    <>
      <div className="draggable-region" />
      <Fade in={entered} timeout={{ enter: 200, exit: 400 }}>
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: 0,
            right: 0,
            zIndex: 10000,
          }}
        >
          <ButtonBase
            style={{ width: 36, height: 28 }}
            onClick={() => {
              try {
                window.api.ipcRendererSend("window-minimize");
              } catch (e) {
                console.warn("Error calling window-minimize:", e);
              }
            }}
          >
            <Minimize fontSize="small" style={{ marginTop: -12 }} />
          </ButtonBase>
          <ButtonBase
            style={{ width: 36, height: 28 }}
            onClick={() => {
              try {
                window.api.ipcRendererSend("window-close");
              } catch (e) {
                console.warn("Error calling window-close:", e);
              }
            }}
          >
            <Close fontSize="small" />
          </ButtonBase>
        </div>
      </Fade>
      <PlayerProvider>
        <Player entered={entered} />
      </PlayerProvider>
    </>
  );
}

export default PlayerContainer;
