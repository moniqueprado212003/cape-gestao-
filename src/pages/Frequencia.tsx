
import { useState } from "react";
import {
  ClipboardCheck,
  LogIn,
  LogOut,
  Users,
  Clock3,
  AlertTriangle,
  Search,
} from "lucide-react";

import { useEstudantes } from "../context/EstudantesContext";
import { useFrequencia } from "../context/FrequenciaContext";
import DataBrasileira from "../components/DataBrasileira";

const diasSemana = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function dataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function horarioAtual(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function Frequencia() {
  const { estudantes } = useEstudantes();

  const {
    registros,
    registrarEntrada,
    registrarSaida,
  } = useFrequencia();

  const [dataSelecionada, setDataSelecionada] = useState(
    () => dataLocal(new Date())
  );

  const [busca, setBusca] = useState("");

  const [mostrarTodos, setMostrarTodos] = useState(false);

  const dataConsulta = new Date(
    `${dataSelecionada}T12:00:00`
  );

  const diaSemana = diasSemana[dataConsulta.getDay()];

  const estudantesAtivos = estudantes.filter(
    (estudante) => estudante.ativo
  );

  const previstos = estudantesAtivos.filter(
    (estudante) => estudante.dias.includes(diaSemana)
  );

  const registrosDia = registros.filter(
    (registro) => registro.data === dataSelecionada
  );

  const estudantesExibidos = estudantesAtivos
    .filter(
      (estudante) =>
        mostrarTodos ||
        estudante.dias.includes(diaSemana) ||
        registrosDia.some(
          (registro) => registro.estudanteId === estudante.id
        )
    )
    .filter((estudante) =>
      estudante.nome
        .toLocaleLowerCase("pt-BR")
        .includes(busca.trim().toLocaleLowerCase("pt-BR"))
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const presentes = registrosDia.filter(
    (registro) =>
      registro.entradaReal !== null &&
      registro.saidaReal === null
  ).length;

  const sairam = registrosDia.filter(
    (registro) => registro.saidaReal !== null
  ).length;

  const aguardando = previstos.filter(
    (estudante) =>
      !registrosDia.some(
        (registro) =>
          registro.estudanteId === estudante.id &&
          registro.entradaReal !== null
      )
  ).length;

  const presentesComRestricao = estudantesAtivos.filter(
    (estudante) =>
      estudante.restricao === "sim" &&
      registrosDia.some(
        (registro) =>
          registro.estudanteId === estudante.id &&
          registro.entradaReal !== null &&
          registro.saidaReal === null
      )
  ).length;

  function confirmarEntrada(estudanteId: number) {
    const horario = horarioAtual();

    registrarEntrada(
      estudanteId,
      dataSelecionada,
      horario
    );
  }

  function confirmarSaida(estudanteId: number) {
    const horario = horarioAtual();

    registrarSaida(
      estudanteId,
      dataSelecionada,
      horario
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Controle de Frequência
        </h2>

        <p className="text-slate-500 mt-1">
          Registre a chegada e a saída dos estudantes.
        </p>

        <p className="text-xs text-amber-700 mt-2">
          Ambiente de testes. Utilize apenas dados fictícios.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label
              htmlFor="data-frequencia"
              className="block text-sm font-medium mb-2"
            >
              Data de atendimento
            </label>

            <DataBrasileira
  id="data-frequencia"
  value={dataSelecionada}
  onChange={setDataSelecionada}
/>
          </div>

          <div className="text-sm text-slate-600 pb-3">
            Dia da semana:{" "}
            <strong>{diaSemana}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            titulo: "Previstos para o dia",
            valor: previstos.length,
            icone: Users,
          },
          {
            titulo: "Presentes agora",
            valor: presentes,
            icone: ClipboardCheck,
          },
          {
            titulo: "Aguardando chegada",
            valor: aguardando,
            icone: Clock3,
          },
          {
            titulo: "Já saíram",
            valor: sairam,
            icone: LogOut,
          },
        ].map(({ titulo, valor, icone: Icone }) => (
          <div
            key={titulo}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <Icone
              size={23}
              className="text-teal-700 mb-3"
            />

            <p className="text-sm text-slate-500">
              {titulo}
            </p>

            <p className="text-3xl font-bold mt-1">
              {valor}
            </p>
          </div>
        ))}
      </div>

      {presentesComRestricao > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle
            className="text-amber-700 shrink-0"
          />

          <p className="text-sm text-amber-900">
            Atenção: existem{" "}
            <strong>
              {presentesComRestricao}
            </strong>{" "}
            estudante(s) presente(s) com restrição
            alimentar cadastrada.
          </p>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <h3 className="text-lg font-semibold">
            Lista de estudantes
          </h3>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(evento) =>
                setMostrarTodos(evento.target.checked)
              }
            />

            Mostrar todos os ativos
          </label>
        </div>

        <div className="relative mb-5">
          <Search
            size={19}
            className="absolute left-3 top-3 text-slate-400"
          />

          <input
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="Pesquisar estudante..."
            aria-label="Pesquisar estudante"
            className="w-full border border-slate-300 rounded-xl py-3 pl-10 pr-4"
          />
        </div>

        {estudantesExibidos.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Nenhum estudante encontrado para esta data.
          </div>
        ) : (
          <div className="space-y-3">
            {estudantesExibidos.map((estudante) => {
              const registro = registrosDia.find(
                (item) =>
                  item.estudanteId === estudante.id
              );

              const presente =
                registro?.entradaReal !== null &&
                registro?.entradaReal !== undefined &&
                registro?.saidaReal === null;

              const saiu =
                registro?.saidaReal !== null &&
                registro?.saidaReal !== undefined;

              const previsto =
                estudante.dias.includes(diaSemana);

              return (
                <div
                  key={estudante.id}
                  className="border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div>
                    <h4 className="font-semibold">
                      {estudante.nome}
                    </h4>

                    <p className="text-sm text-slate-500 mt-1">
                      Previsto:{" "}
                      {estudante.entrada} às{" "}
                      {estudante.saida}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          presente
                            ? "bg-green-100 text-green-800"
                            : saiu
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {presente
                          ? "Presente"
                          : saiu
                          ? "Saída registrada"
                          : "Aguardando chegada"}
                      </span>

                      {!previsto && (
                        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                          Fora dos dias previstos
                        </span>
                      )}

                      {estudante.restricao === "sim" && (
                        <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                          Restrição alimentar
                        </span>
                      )}
                    </div>

                    {registro && (
                      <p className="text-xs text-slate-500 mt-2">
                        Entrada real:{" "}
                        {registro.entradaReal ?? "—"}
                        {" • "}
                        Saída real:{" "}
                        {registro.saidaReal ?? "—"}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!registro?.entradaReal && (
                      <button
                        type="button"
                        onClick={() =>
                          confirmarEntrada(estudante.id)
                        }
                        className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 rounded-xl flex items-center gap-2"
                      >
                        <LogIn size={18} />
                        Registrar entrada
                      </button>
                    )}

                    {presente && (
                      <button
                        type="button"
                        onClick={() =>
                          confirmarSaida(estudante.id)
                        }
                        className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-xl flex items-center gap-2"
                      >
                        <LogOut size={18} />
                        Registrar saída
                      </button>
                    )}

                    {saiu && (
                      <span className="text-sm text-slate-500">
                        Atendimento finalizado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
