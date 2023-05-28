import path from "path";
import * as os from "os";
import fse from "fs-extra";
import Electron from "electron";
import { TalexTouch } from "../types/touch-core";

function updateWallPaperPos(win: Electron.BrowserWindow) {
    const [x, y] = win.getPosition();

    // const [width, height] = win.getSize()

    // get screen size
    const screenSize = Electron.screen.getPrimaryDisplay();

    win.webContents.executeJavaScript(`
            document.body.style.setProperty('--winX', '${-x}px')
            document.body.style.setProperty('--winY', '${-y}px')
            
            document.body.style.setProperty('--winWidth', '${
              screenSize.size.width
            }px')
            document.body.style.setProperty('--winHeight', '${
              screenSize.size.height
            }px')
        `);
  }

function refreshWallPaper(win: Electron.BrowserWindow) {
    const wallPaperPath = path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Microsoft",
      "Windows",
      "Themes",
      "TranscodedWallpaper"
    );

    if (!fse.existsSync(wallPaperPath)) {
      console.log("No wallpaper found");
      return;
    }

    const wallPaper = fse.readFileSync(wallPaperPath);

    const wallPaperBase64 = Buffer.from(wallPaper).toString("base64");

    const wallPaperBase64Data = "data:image/jpg;base64," + wallPaperBase64;

    win.webContents.insertCSS(`
            .touch-blur #app {
              background-image: url('${wallPaperBase64Data}') !important;
              background-repeat: no-repeat !important;
              background-position: var(--winX) var(--winY) !important;  
              background-size: var(--winWidth) var(--winHeight) !important;
            }
        `);

    fse.watch(wallPaperPath, (eventType, filename) => {
      try {
        refreshWallPaper(win);
      } catch (e) {
        if (e.message.indexOf("EBUSY") !== -1) {
          return;
        }

        console.log("[Background-Blur] Error: " + e.message, e);
      }
    });

    updateWallPaperPos(win);
}

export default {
  name: Symbol("BackgroundBlur"),
  filePath: false,
  init(app) {
    if (process.platform.indexOf("win") === -1) return; // Only windows supports
    const win = app.window.window;
  
    win.webContents.addListener("dom-ready", refreshWallPaper.bind(null, win));
  
    win.on("move", updateWallPaperPos.bind(null, win));
    win.on("enter-full-screen", updateWallPaperPos.bind(null, win));
    win.on("leave-full-screen", updateWallPaperPos.bind(null, win));
  },
  destroy() {},
} as TalexTouch.IModule;
