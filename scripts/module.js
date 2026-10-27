let socket;
let requests = [];

Hooks.once("init", () => {
  game.settings.register("table-safety-plus", "viewedHint", {
    name: "Table Safety Plus - Hint Viewed",
    hint: "Whether the user has viewed the hint dialog before.",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("table-safety-plus", "version", {
    name: "Table Safety Plus - Module Version",
    hint: "The current version of the Table Safety module.",
    scope: "client",
    config: false,
    type: String,
    default: "1.0.0"
  });

  game.settings.register("table-safety-plus", "enablePause", {
    name: "Enable Pause Requests",
    hint: "Allow players to request pauses during the game.",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: true
  });

  game.settings.register("table-safety-plus", "enableFastForward", {
    name: "Enable Fast-Forward Requests",
    hint: "Allow players to request fast-forwards during the game.",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: true
  });

  game.settings.register("table-safety-plus", "enableHardstop", {
    name: "Enable Hard-Stop Requests",
    hint: "Allow players to request hard-stops during the game.",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: true
  });

  game.settings.register("table-safety-plus", "enableHands", {
    name: "Enable Speak Requests",
    hint: "Allow players to request speaking opportunities during the game.",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: true
  });

  const installedVersion = game.modules.find(m => m.id === "table-safety-plus").version;
  const savedVersion = game.settings.get("table-safety-plus", "version");
  
  if (installedVersion !== savedVersion) {
    console.log(`Table Safety Plus | Updating module settings version from ${savedVersion} to ${installedVersion}`);
    game.settings.set("table-safety-plus", "version", installedVersion);
    game.settings.set("table-safety-plus", "viewedHint", false);
  }
});

Hooks.once("ready", () => {
  if (!game.settings.get("table-safety-plus", "viewedHint")) {
    new foundry.applications.api.DialogV2({
      window: { title: "Table Safety Plus - Hint" },
      content: `
        <h2 style="margin-bottom: 0; padding-bottom: 0;">${game.i18n.localize("TableSafety.HINT.Title")}</h2>
        <hr style="margin-top: 0; padding-top: 0;"/>
        <p style="width: 80ch;">${game.i18n.localize("TableSafety.HINT.Paragraph1")}</p>
        <div style="display: flex; flex-direction: row; gap: 10px; align-items: center; margin-top: 10px; margin-bottom: 10px;">
          <img src="modules/table-safety-plus/v13-buttons.png" style="width: 40ch; margin-top: 10px; margin-bottom: 10px;" alt="Player buttons" />
          <video autoplay style="width: 40ch; margin-top: 10px; margin-bottom: 10px;" muted loop> 
            <source src="modules/table-safety-plus/v13-gm-button-highlight.webm" type="video/webm">
            Your browser does not support the video tag.
          </video>
        </div>
        <div style="display: flex; flex-direction: row; gap: 10px; justify-content: space-around; align-items: center; margin-top: 10px; margin-bottom: 10px;">
          <img src="modules/table-safety-plus/v13-sidebar-buttons.png" style="height: 200px; object-fit: scale-down; margin-top: 10px; margin-bottom: 10px;" alt="Player sidebar buttons" />
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <p style="width: 60ch;">${game.i18n.localize("TableSafety.HINT.Paragraph2")}</p>
            <p style="width: 60ch;">${game.i18n.localize("TableSafety.HINT.Paragraph3")}</p>
          </div>
          <img src="modules/table-safety-plus/v13-gm-sidebar-buttons.png" style="height: 200px; object-fit: scale-down; margin-top: 10px; margin-bottom: 10px;" alt="Player sidebar buttons" />
        </div>
        <p>${game.i18n.localize("TableSafety.HINT.Footer")}</p>
      `,
      buttons: [{
        action: "ok",
        label: "Got it!",
        default: true,
        callback: (event, button, dialog) => dialog.close()
      }],
      submit: result => {
        game.settings.set("table-safety-plus", "viewedHint", true);
        return;
      }
    }).render({ force: true });
  }
});

Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule("table-safety-plus");
  
  // Ack
  socket.register("ack", gmAcknowledgement);
	
  // Pause
  socket.register("pause", tableSafetyPauseRequest);

  // Fastforward
  socket.register("fastforward", tableSafetyFastforwardRequest);

  // Hardstop
  socket.register("hardstop", tableSafetyHardstopRequest);

  // Hands
  socket.register("hands", tableSafetyHandsRequest);
  socket.register("handsNotify", tableSafetyHandsNotifyAll);

  console.log(socket);
});

function highlightAcknowledge() {
  document.querySelectorAll(".table-safety-acknowledge").forEach(b => b.classList.add("active"));
}

// v13+ changed the signature of game.togglePause (second arg is now an options object)
function pauseForEveryone() {
  if (game.release.generation >= 13) game.togglePause(true, { broadcast: true });
  else game.togglePause(true, true);
}

function tableSafetyPauseRequest(userId) {
  highlightAcknowledge();
  ui.notifications.warn(game.i18n.localize("TableSafety.MESSAGES.PauseRequest"), { permanent: true });
  requests.push({
    type: "pause",
    user: userId,
    time: Date.now()
  })
}

function tableSafetyHardstopRequest(userId) {
  highlightAcknowledge();
  ui.notifications.warn(game.i18n.localize("TableSafety.MESSAGES.HardstopRequest"), { permanent: true });
  requests.push({
    type: "hardstop",
    user: userId,
    time: Date.now()
  })
}

function tableSafetyFastforwardRequest(userId) {
  highlightAcknowledge();
  const username = game.users.get(userId).name;
  ui.notifications.warn(game.i18n.localize("TableSafety.MESSAGES.FastForwardRequest"), { permanent: true });
  requests.push({
    type: "fastforward",
    user: userId,
    time: Date.now()
  })
}

function tableSafetyHandsRequest(userId) {
  highlightAcknowledge();
  const username = game.users.get(userId).name;
  ui.notifications.warn(game.i18n.format("TableSafety.MESSAGES.SpeakRequest", { username }), { permanent: true });
  requests.push({
    type: "hands",
    user: userId,
    time: Date.now()
  })
}

function tableSafetyHandsNotifyAll() {
  if (!game.user.isGM) 
    ui.notifications.warn(game.i18n.localize("TableSafety.MESSAGES.SpeakNotification"));
}

async function gmAcknowledgement(userId) {
  new foundry.applications.api.DialogV2({
    window: { title: "Acknowledgement" },
    content: game.i18n.localize("TableSafety.MESSAGES.Acknowledged"),
    buttons: [{
      action: "ok",
      label: "Confirm",
      default: true,
      callback: (event, button, dialog) => dialog.close()
    }],
    submit: result => {
      return;
    }
  }).render({ force: true });
}

Hooks.on("renderSidebarTab", (tab) => {
  if (game.version.major > 12) return; // Only run for v12 and below

  if (tab.title !== "Chat Log") return;

  const pauseButton = document.createElement('button');
  const pauseButtonIcon = document.createElement('i');
  pauseButtonIcon.classList.add("fa-solid", "fa-pause");
  pauseButton.appendChild(pauseButtonIcon);
  pauseButton.type = "button";
  pauseButton.classList.add("table-safety-button")
  pauseButton.onclick = (event) => {
    socket.executeForAllGMs("pause", game.user._id);
  };
  
  const hardstopButton = document.createElement('button');
  const hardstopButtonIcon = document.createElement('i');
  hardstopButtonIcon.classList.add("fa-solid", "fa-shield-xmark");
  hardstopButton.appendChild(hardstopButtonIcon);
  hardstopButton.type = "button";
  hardstopButton.classList.add("table-safety-button")
  hardstopButton.onclick = (event) => {
    socket.executeForAllGMs("hardstop", game.user._id);
  };

  const fastforwardButton = document.createElement('button');
  const fastforwardButtonIcon = document.createElement('i');
  fastforwardButtonIcon.classList.add("fa-solid", "fa-forward");
  fastforwardButton.appendChild(fastforwardButtonIcon);
  fastforwardButton.type = "button";
  fastforwardButton.classList.add("table-safety-button")
  fastforwardButton.onclick = async (event) => {
    await socket.executeForAllGMs("fastforward", game.user._id);
  };

  const handsButton = document.createElement('button');
  const handsButtonIcon = document.createElement('i');
  handsButtonIcon.classList.add("fa-solid", "fa-hand");
  handsButton.appendChild(handsButtonIcon);
  handsButton.type = "button";
  handsButton.classList.add("table-safety-button")
  handsButton.onclick = async (event) => {
    await socket.executeForOthers("handsNotify");
    await socket.executeForAllGMs("hands", game.user._id);
  };

  const acknowledgeButton = document.createElement('button');
  const acknowledgeButtonIcon = document.createElement('i');
  acknowledgeButtonIcon.classList.add("fa-solid", "fa-thumbs-up");
  acknowledgeButton.appendChild(acknowledgeButtonIcon);
  acknowledgeButton.type = "button";
  acknowledgeButton.classList.add("table-safety-button", "table-safety-acknowledge")
  acknowledgeButton.onclick = (event) => {
    requests.forEach(r => {
      if (r.type === "pause") pauseForEveryone();
      socket.executeAsUser("ack", r.user);
    });
    requests = [];
    acknowledgeButton.classList.remove("active");
  };

  const enablePause = game.settings.get("table-safety-plus", "enablePause");
  const enableFastForward = game.settings.get("table-safety-plus", "enableFastForward");
  const enableHardstop = game.settings.get("table-safety-plus", "enableHardstop");
  const enableHands = game.settings.get("table-safety-plus", "enableHands");
  
  const control = document.createElement('div');
  if (!game.user.isGM && enablePause) control.appendChild(pauseButton);
  if (!game.user.isGM && enableHardstop) control.appendChild(hardstopButton);
  if (!game.user.isGM && enableHands) control.appendChild(handsButton);
  if (!game.user.isGM && enableFastForward) control.appendChild(fastforwardButton);
  if (game.user.isGM) control.appendChild(acknowledgeButton);
  control.classList.add("table-safety-plus");

  //const nodes = Array.from(tab.element[0].childNodes);
  //const before = nodes.filter(f => f.id === "chat-controls");
  const before = tab.element[0].childNodes[5];

  tab.element[0].insertBefore(control, before);
});

/* ---------------------------------------------------------------------------
 * v13 / v14 chat controls
 * The chat input gets moved between the sidebar, the collapsed notification
 * area and popouts. v14 also replaced the old "#roll-privacy" roll-mode box
 * with message modes, so we no longer rely on one hard-coded element: the
 * control bar is built once and (re)attached to whatever container exists.
 * ------------------------------------------------------------------------- */
let tableSafetyControl = null;

function makeButton(icon, tooltipKey, extraClasses, onclick) {
  const button = document.createElement("button");
  const i = document.createElement("i");
  i.classList.add("fa-solid", icon);
  button.appendChild(i);
  button.type = "button";
  button.classList.add("ui-control", "icon", "table-safety-button", ...extraClasses);
  button.dataset.tooltip = game.i18n.localize(tooltipKey);
  button.onclick = onclick;
  return button;
}

function buildTableSafetyControl() {
  const sent = () => ui.notifications.info(game.i18n.localize("TableSafety.MESSAGES.RequestSent"));
  const control = document.createElement("div");
  control.classList.add("table-safety-plus");

  if (game.user.isGM) {
    const ack = makeButton("fa-thumbs-up", "TableSafety.TOOLTIPS.AcknowledgeTooltip", ["table-safety-acknowledge"], () => {
      requests.forEach(r => {
        if (r.type === "pause") pauseForEveryone();
        socket.executeAsUser("ack", r.user);
      });
      requests = [];
      document.querySelectorAll(".table-safety-acknowledge").forEach(b => b.classList.remove("active"));
    });
    control.appendChild(ack);
    return control;
  }

  if (game.settings.get("table-safety-plus", "enablePause")) control.appendChild(
    makeButton("fa-pause", "TableSafety.TOOLTIPS.PauseTooltip", [], () => {
      sent(); socket.executeForAllGMs("pause", game.user.id);
    }));
  if (game.settings.get("table-safety-plus", "enableHardstop")) control.appendChild(
    makeButton("fa-shield-xmark", "TableSafety.TOOLTIPS.HardstopTooltip", [], () => {
      sent(); socket.executeForAllGMs("hardstop", game.user.id);
    }));
  if (game.settings.get("table-safety-plus", "enableHands")) control.appendChild(
    makeButton("fa-hand", "TableSafety.TOOLTIPS.SpeakTooltip", [], async () => {
      sent();
      await socket.executeForOthers("handsNotify");
      await socket.executeForAllGMs("hands", game.user.id);
    }));
  if (game.settings.get("table-safety-plus", "enableFastForward")) control.appendChild(
    makeButton("fa-forward", "TableSafety.TOOLTIPS.FastForwardTooltip", [], async () => {
      sent(); await socket.executeForAllGMs("fastforward", game.user.id);
    }));
  return control;
}

// Find the best place to put the buttons, newest Foundry layout first.
// The bar is placed as its own row (never inside the mode button group).
function findTableSafetyTarget() {
  const input = document.querySelector("#chat-message");

  // v14 message-mode group, then v13 roll privacy, then generic chat controls
  let group = document.querySelector('[data-action="messageMode"]')?.parentElement;
  for (const sel of ["#roll-privacy", "#chat-controls", ".chat-controls"]) {
    if (group) break;
    group = document.querySelector(sel);
  }

  if (group && input) {
    // Climb from the group to the ancestor that shares a container with the input,
    // then sit directly after it (i.e. between the mode buttons and the text box).
    let row = group;
    while (row.parentElement && !row.parentElement.contains(input)) row = row.parentElement;
    if (row.parentElement) return { parent: row.parentElement, ref: row.nextSibling };
  }
  if (group?.parentElement) return { parent: group.parentElement, ref: group.nextSibling };

  // Last resort: directly above the chat text box
  if (input?.parentElement) return { parent: input.parentElement, ref: input };
  return null;
}

function attachTableSafetyControl() {
  if (game.release.generation < 13) return;
  if (!game.ready || !socket) return;
  tableSafetyControl ??= buildTableSafetyControl();
  const target = findTableSafetyTarget();
  if (!target) {
    console.warn("Table Safety Plus | Could not find the chat controls to attach to.");
    return;
  }
  const ref = target.ref === tableSafetyControl ? tableSafetyControl.nextSibling : target.ref;
  if (tableSafetyControl.parentElement === target.parent && tableSafetyControl.nextSibling === ref) return;
  target.parent.insertBefore(tableSafetyControl, ref);
}

// Re-attach whenever the chat input moves or the chat log re-renders
Hooks.on("renderChatInput", () => attachTableSafetyControl());
Hooks.on("renderChatLog", () => attachTableSafetyControl());
Hooks.on("collapseSidebar", () => setTimeout(attachTableSafetyControl, 50));
Hooks.on("changeSidebarTab", () => setTimeout(attachTableSafetyControl, 50));
Hooks.once("ready", () => setTimeout(attachTableSafetyControl, 250));
