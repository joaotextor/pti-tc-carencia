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

  let currentDate = null;
  let tcData = null;
  let carenciaData = null;

  lines.forEach((line) => {
    const dateMatch = line.match(/Analise do direito em (\d{2}\/\d{2}\/\d{4})/);
    const tcMatch = line.match(
      /Tempo de contribuição : (\d+)a, (\d+)m, (\d+)d/
    );
    const carenciaMatch = line.match(/Quantidade de carência : (\d+)/);

    if (dateMatch) {
      // If we have complete data from previous date, save it
      if (currentDate && tcData && carenciaData) {
        entries[currentDate.date] = {
          anos: tcData.anos,
          meses: tcData.meses,
          dias: tcData.dias,
          carencia: carenciaData,
          isDER: currentDate.isDER,
        };
      }
      // Start new date entry
      currentDate = {
        date: dateMatch[1],
        isDER: line.includes("DER"),
      };
      tcData = null;
      carenciaData = null;
    }

    if (tcMatch) {
      tcData = {
        anos: tcMatch[1],
        meses: tcMatch[2],
        dias: tcMatch[3],
      };
    }

    if (carenciaMatch) {
      carenciaData = carenciaMatch[1];
    }
  });

  // Save the last entry
  if (currentDate && tcData && carenciaData) {
    entries[currentDate.date] = {
      anos: tcData.anos,
      meses: tcData.meses,
      dias: tcData.dias,
      carencia: carenciaData,
      isDER: currentDate.isDER,
    };
  }

  console.log("Parsed entries:", entries);
  return entries;
}

async function simulateTyping(input, value) {
  input.focus();

  // Clear existing value
  input.value = "";

  // Convert value to string and type each digit
  const valueStr = value.toString();
  for (let i = 0; i < valueStr.length; i++) {
    const digit = valueStr[i];
    input.value += digit;

    // Dispatch events for each digit
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: digit,
        code: `Digit${digit}`,
        bubbles: true,
      })
    );
    input.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: digit,
        code: `Digit${digit}`,
        bubbles: true,
      })
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: digit,
        code: `Digit${digit}`,
        bubbles: true,
      })
    );

    // Wait 100ms before next keystroke
    await new Promise((resolve) => setTimeout(resolve, 0.1));
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
}

async function fillTable(entries) {
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
    ["31/12/2022", "31/12/2022"],
    ["31/12/2023", "31/12/2023"],
  ]);

  for (const row of rows) {
    const dateCell = row.querySelector("td");
    if (!dateCell) continue;

    const cellText = dateCell.textContent.trim();
    let targetDate = null;

    for (const [key, value] of dateMapping) {
      if (cellText.includes(key)) {
        targetDate = value;
        break;
      }
    }

    if (cellText.includes("DER")) {
      targetDate = Object.keys(entries).find((date) => entries[date].isDER);
    }

    if (targetDate && entries[targetDate]) {
      const inputs = row.querySelectorAll("input");
      if (inputs.length >= 4) {
        for (let i = 0; i < inputs.length; i++) {
          let value;
          switch (i) {
            case 0:
              value = parseInt(entries[targetDate].anos, 10);
              break;
            case 1:
              value = parseInt(entries[targetDate].meses, 10);
              break;
            case 2:
              value = parseInt(entries[targetDate].dias, 10);
              break;
            case 3:
              value = parseInt(entries[targetDate].carencia, 10);
              break;
          }

          await simulateTyping(inputs[i], value);
        }
      }
    }
  }
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
