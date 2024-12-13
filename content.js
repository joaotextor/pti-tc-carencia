window.addEventListener("scroll", createImportButton);

function isImportButtonPresent() {
  return document.querySelector(".import-tc-button") !== null;
}

function createImportButton() {
  if (isImportButtonPresent()) {
    return;
  }
  const targetText = "Opcional: tempo já reconhecido pelo INSS";
  const targetHeading = Array.from(document.getElementsByTagName("h3")).find(
    (element) => element.textContent === targetText
  );

  if (targetHeading) {
    const button = document.createElement("button");
    button.textContent = "Importar TC e Carência";
    button.className = "import-tc-button";
    button.addEventListener("click", openImportPopup);
    targetHeading.insertAdjacentElement("afterend", button);
  }
}

function parseInputText(text) {
  const entries = {};
  const lines = text.split("\n").filter((line) => line.trim());

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    if (currentLine.includes("Analise do direito em")) {
      const dateMatch = currentLine.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) continue;

      const date = dateMatch[0];

      let tcLine = "";
      let carenciaLine = "";

      // Look for TC and carencia in next lines
      for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
        if (lines[j].includes("Tempo de contribuição")) {
          tcLine = lines[j];
        }
        if (lines[j].includes("Quantidade de carência")) {
          carenciaLine = lines[j];
        }
      }

      const tcMatch = tcLine.match(/(\d+)a, (\d+)m, (\d+)d/);
      const carenciaMatch = carenciaLine.match(/: (\d+)/);

      if (tcMatch && carenciaMatch) {
        entries[date] = {
          anos: tcMatch[1],
          meses: tcMatch[2],
          dias: tcMatch[3],
          carencia: carenciaMatch[1],
          isDER: currentLine.includes("DER"),
        };
      }
    }
  }
  console.log("Parsed entries:", entries); // Debug log
  return entries;
}

function fillTable(entries) {
  if (!entries || Object.keys(entries).length === 0) {
    console.log("No entries to process");
    return;
  }

  const rows = document.querySelectorAll("table tr");
  const dateMapping = new Map([
    ["EC nº 20/98", "16/12/1998"],
    ["Lei 9.876/99", "28/11/1999"],
    ["Reforma - EC nº 103/19", "13/11/2019"],
    ["31/12/2019", "31/12/2019"],
    ["31/12/2020", "31/12/2020"],
    ["31/12/2021", "31/12/2021"],
  ]);

  rows.forEach((row) => {
    const dateCell = row.querySelector("td");
    if (!dateCell) return;

    const cellText = dateCell.textContent.trim();
    let targetDate = null;

    // Find the matching date
    for (const [key, value] of dateMapping) {
      if (cellText.includes(key)) {
        targetDate = value;
        break;
      }
    }

    // Handle DER separately
    if (cellText.includes("DER")) {
      targetDate = Object.keys(entries).find((date) => entries[date].isDER);
    }

    console.log("Processing row:", cellText, "Target date:", targetDate); // Debug log

    if (targetDate && entries[targetDate]) {
      const inputs = row.querySelectorAll("input");
      if (inputs.length >= 4) {
        inputs[0].value = entries[targetDate].anos;
        inputs[1].value = entries[targetDate].meses;
        inputs[2].value = entries[targetDate].dias;
        inputs[3].value = entries[targetDate].carencia;
      }
    }
  });
}

function handleImport() {
  const text = document.querySelector(".popup-content textarea").value;
  const entries = parseInputText(text);
  fillTable(entries);
  document.querySelector(".import-popup").remove();
}

function openImportPopup() {
  const popup = document.createElement("div");
  popup.className = "import-popup";
  popup.innerHTML = `
        <div class="popup-content">
            <h3>Importar TC e Carência</h3>
            <textarea placeholder="Cole seu texto aqui"></textarea>
            <button id="confirmImport">Importar</button>
            <button id="closePopup">Fechar</button>
        </div>
    `;
  document.body.appendChild(popup);

  document
    .getElementById("closePopup")
    .addEventListener("click", () => popup.remove());
  document
    .getElementById("confirmImport")
    .addEventListener("click", handleImport);
}

createImportButton();
