
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

import { EstudantesProvider } from "./context/EstudantesContext";
import { FrequenciaProvider } from "./context/FrequenciaContext";
import { RefeicoesProvider } from "./context/RefeicoesContext";
import { EstoqueProvider } from "./context/EstoqueContext";
import { ReceitasProvider } from "./context/ReceitasContext";
import { CardapioProvider } from "./context/CardapioContext";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <EstudantesProvider>
      <FrequenciaProvider>
        <RefeicoesProvider>
  <EstoqueProvider>
    <ReceitasProvider>
  <CardapioProvider>
    <App />
  </CardapioProvider>
</ReceitasProvider>
  </EstoqueProvider>
</RefeicoesProvider>
      </FrequenciaProvider>
    </EstudantesProvider>
  </React.StrictMode>
);
