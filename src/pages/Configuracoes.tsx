
import { useState } from "react";
import {
  Settings,
  Clock3,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UtensilsCrossed,
} from "lucide-react";

import {
  useRefeicoes,
  type TipoRefeicao,
} from "../context/RefeicoesContext";

const horariosPadrao: Record<TipoRefeicao, string> = {
  lanche_manha: "09:15",
  almoco: "12:00",
  lanche_tarde: "15:15",
};

function horarioValido(horario: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);
}

export default function Configuracoes() {
  const { refeicoes, atualizarHorario } = useRefeicoes();

  const [horariosEditados, setHorariosEditados] = useState<
    Record<string, string>
  >({});

  const [mensagem, setMensagem] = useState("");

  function obterHorario(id: TipoRefeicao, atual: string) {
    return horariosEditados[id] ?? atual;
  }

  function alterarCampo(id: TipoRefeicao, valor: string) {
    setHorariosEditados((anterior) => ({
      ...anterior,
      [id]: valor,
    }));

    setMensagem("");
  }

  function salvarHorarios() {
    const existeHorarioInvalido = refeicoes.some(
      (refeicao) =>
        !horarioValido(
          obterHorario(refeicao.id, refeicao.horario)
        )
    );

    if (existeHorarioInvalido) {
      setMensagem(
        "Verifique os horários informados antes de salvar."
      );
      return;
    }

    for (const refeicao of refeicoes) {
      const novoHorario = obterHorario(
        refeicao.id,
        refeicao.horario
      );

      atualizarHorario(refeicao.id, novoHorario);
    }

    setHorariosEditados({});
    setMensagem("Horários atualizados com sucesso!");
  }

  function restaurarPadrao() {
    for (const refeicao of refeicoes) {
      atualizarHorario(
        refeicao.id,
        horariosPadrao[refeicao.id]
      );
    }

    setHorariosEditados({});
    setMensagem("Horários padrão restaurados.");
  }

  const existeAlteracao = refeicoes.some(
    (refeicao) =>
      obterHorario(refeicao.id, refeicao.horario) !==
      refeicao.horario
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="text-teal-700" size={28} />

          <h2 className="text-2xl font-bold">
            Configurações
          </h2>
        </div>

        <p className="text-slate-500">
          Personalize os parâmetros de funcionamento
          do Sistema de Gestão CAPE.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <UtensilsCrossed
            className="text-teal-700"
            size={23}
          />

          <h3 className="text-lg font-semibold">
            Horários das refeições
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          Defina os horários utilizados para calcular
          a previsão de refeições dos estudantes.
          As alterações serão aplicadas automaticamente
          ao módulo Cozinha após salvar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {refeicoes.map((refeicao) => (
            <div
              key={refeicao.id}
              className="border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock3
                  size={19}
                  className="text-teal-700"
                />

                <label
                  htmlFor={`horario-${refeicao.id}`}
                  className="font-medium"
                >
                  {refeicao.nome}
                </label>
              </div>

              <input
                id={`horario-${refeicao.id}`}
                type="time"
                value={obterHorario(
                  refeicao.id,
                  refeicao.horario
                )}
                onChange={(evento) =>
                  alterarCampo(
                    refeicao.id,
                    evento.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-xl p-3 text-lg font-semibold"
              />

              <p className="text-xs text-slate-500 mt-3">
                Horário atualmente configurado:{" "}
                {refeicao.horario}
              </p>
            </div>
          ))}
        </div>

        {mensagem && (
          <div
            role="status"
            className={`mt-5 rounded-xl p-4 flex items-center gap-2 text-sm ${
              mensagem.includes("sucesso") ||
              mensagem.includes("restaurados")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {mensagem.includes("Verifique") ? (
              <AlertCircle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}

            {mensagem}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            onClick={salvarHorarios}
            disabled={!existeAlteracao}
            className="bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2"
          >
            <Save size={19} />
            Salvar horários
          </button>

          <button
            type="button"
            onClick={restaurarPadrao}
            className="border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-medium flex items-center gap-2"
          >
            <RotateCcw size={19} />
            Restaurar padrão
          </button>
        </div>
      </section>

      <section className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
        <h3 className="font-semibold text-teal-900 mb-2">
          Como os horários são utilizados?
        </h3>

        <p className="text-sm text-teal-900">
          O sistema compara o horário de cada refeição
          com os horários de entrada e saída previstos
          no cadastro dos estudantes.
        </p>

        <p className="text-sm text-teal-900 mt-2">
          Por exemplo, um estudante com atendimento
          das 09:00 às 17:00 será contabilizado em
          todas as refeições realizadas dentro desse
          intervalo.
        </p>

        <p className="text-xs text-teal-800 mt-4">
          Nesta fase de desenvolvimento, as configurações
          são temporárias e serão redefinidas ao atualizar
          a página. A persistência será implementada
          posteriormente.
        </p>
      </section>
    </div>
  );
}
