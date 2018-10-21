"use strict";
// Very simple electron wrapper script that allows us to use asciiflow2 as a
// desktop application

const electron = require("electron");

const path = require("path");
const url = require("url");

let mainWindow;

electron.app.on("ready", () => {
  mainWindow = new electron.BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "images", "favicon.png"),
  });
  mainWindow.setMenu(null);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file:",
    slashes: true,
  }));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

electron.app.on("window-all-closed", () => {
  electron.app.quit();
});
