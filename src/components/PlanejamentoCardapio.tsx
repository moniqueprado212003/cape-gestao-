
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Trash2,
  UtensilsCrossed,
  Calculator,
  Users,
  AlertTriangle,
} from "lucide-react";

import DataBrasileira from "./DataBrasileira";
import { useReceitas } from "../context/ReceitasContext";
import { useRefeicoes } from "../context/RefeicoesContext";
import type { TipoRefeicao } from "../context/RefeicoesContext";
import { useCardapio } from "../context/CardapioContext";
import { useEstudantes } from "../context/EstudantesContext";
import { useFrequencia } from "../context/FrequenciaContext";
import { useEstoque } from "../context/EstoqueContext";

import {
  calcularEstudantesRefeicao,
} from "../utils/calcularEstudantesRefeicao";

type ModoCalculo = "previstos" | "confirmados" | "manual";

function dataHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export default function PlanejamentoCardapio() {
  const { receitas } = useReceitas();
  const { refeicoes } = useRefeicoes();
  const { estudantes } = useEstudantes();
  const { registros } = useFrequencia();
  const { produtos, lotes } = useEstoque();

  const {
    planejamentos,
    salvarPlanejamento,
    excluirPlanejamento,
  } = useCardapio();

  const [data, setData] = useState(dataHoje());

  const [refeicaoId, setRefeicaoId] =
    useState<TipoRefeicao>("lanche_manha");

  const [receitasSelecionadas, setReceitasSelecionadas] =
    useState<number[]>([]);

  const [edicaoAtiva, setEdicaoAtiva] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [modoCalculo, setModoCalculo] =
    useState<ModoCalculo>("previstos");

  const [porcoesManuais, setPorcoesManuais] = useState("1");

  const refeicaoSelecionada = refeicoes.find(
    (item) => item.id === refeicaoId
  );

  const planejamentoAtual = planejamentos.find(
    (item) =>
      item.data === data &&
      item.refeicaoId === refeicaoId
  );

  const receitasMarcadas = planejamentoAtual
    ? planejamentoAtual.receitasIds
    : receitasSelecionadas;

  const selecaoAtual = edicaoAtiva
    ? receitasSelecionadas
    : receitasMarcadas;

  const planejamentosDoDia = planejamentos.filter(
    (item) => item.data === data
  );

  const estudantesPrevistos = calcularEstudantesRefeicao({
    estudantes,
    registros,
    data,
    horarioRefeicao: refeicaoSelecionada?.horario ?? "",
    modo: "previstos",
  });

  const estudantesConfirmados = calcularEstudantesRefeicao({
    estudantes,
    registros,
    data,
    horarioRefeicao: refeicaoSelecionada?.horario ?? "",
    modo: "confirmados",
  });

  const quantidadePorcoes =
    modoCalculo === "previstos"
      ? estudantesPrevistos
      : modoCalculo === "confirmados"
        ? estudantesConfirmados
        : Number(porcoesManuais);

  const porcoesValidas =
    Number.isFinite(quantidadePorcoes) &&
    Number.isInteger(quantidadePorcoes) &&
    quantidadePorcoes > 0;

  const receitasDoCalculo = receitas.filter((receita) =>
    planejamentoAtual?.receitasIds.includes(receita.id)
  );

  const ingredientesAgrupados = new Map<number, number>();

  if (porcoesValidas) {
    receitasDoCalculo.forEach((receita) => {
      if (receita.porcoes <= 0) return;

      receita.ingredientes.forEach((ingrediente) => {
        const quantidadeNecessaria =
          (ingrediente.quantidade / receita.porcoes) *
          quantidadePorcoes;

        const quantidadeAnterior =
          ingredientesAgrupados.get(ingrediente.produtoId) ?? 0;

        ingredientesAgrupados.set(
          ingrediente.produtoId,
          quantidadeAnterior + quantidadeNecessaria
        );
      });
    });
  }

  const ingredientesCalculados = Array.from(
    ingredientesAgrupados.entries()
  ).map(([produtoId, quantidadeNecessaria]) => {
    const produto = produtos.find(
      (item) => item.id === produtoId
    );

    const lotesDoProduto = lotes.filter(
      (lote) =>
        lote.produtoId === produtoId &&
        lote.validade !== "" &&
        lote.validade >= data
    );

    const estoqueDisponivel = lotesDoProduto.reduce(
      (total, lote) => total + lote.quantidade,
      0
    );

    return {
      produtoId,
      nome: produto?.nome ?? "Produto não encontrado",
      unidade: produto?.unidade ?? "",
      quantidadeNecessaria,
      estoqueDisponivel,
      quantidadeFaltante: Math.max(
        0,
        quantidadeNecessaria - estoqueDisponivel
      ),
    };
  });

  function alternarReceita(id: number) {
    const selecaoBase = edicaoAtiva
      ? receitasSelecionadas
      : receitasMarcadas;

    const novasReceitas = selecaoBase.includes(id)
      ? selecaoBase.filter((item) => item !== id)
      : [...selecaoBase, id];

    setReceitasSelecionadas(novasReceitas);
    setEdicaoAtiva(true);
    setMensagem("");
    setErro("");
  }

  function salvar() {
    setErro("");
    setMensagem("");

    if (!data) {
      setErro("Selecione uma data.");
      return;
    }

    if (selecaoAtual.length === 0) {
      setErro("Selecione pelo menos uma receita.");
      return;
    }

    salvarPlanejamento(data, refeicaoId, selecaoAtual);

    setEdicaoAtiva(false);
    setReceitasSelecionadas([]);

    setMensagem("Cardápio salvo com sucesso!");
  }

  function excluir(id: number) {
    if (
      !window.confirm(
        "Deseja realmente excluir este planejamento?"
      )
    ) {
      return;
    }

    excluirPlanejamento(id);
    setEdicaoAtiva(false);
    setReceitasSelecionadas([]);
    setMensagem("Planejamento excluído.");
  }

  function alterarData(novaData: string) {
    setData(novaData);
    setEdicaoAtiva(false);
    setReceitasSelecionadas([]);
    setMensagem("");
    setErro("");
  }

  function alterarRefeicao(novoId: string) {
    setRefeicaoId(novoId as TipoRefeicao);
    setEdicaoAtiva(false);
    setReceitasSelecionadas([]);
    setMensagem("");
    setErro("");
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays size={26} className="text-teal-700" />

        <div>
          <h3 className="text-lg font-semibold">
            Planejamento do cardápio
          </h3>

          <p className="text-sm text-slate-500">
            Organize as receitas de cada refeição.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Data do cardápio
          </label>

          <DataBrasileira
            id="data-planejamento"
            value={data}
            onChange={alterarData}
          />
        </div>

        <div>
          <label
            htmlFor="refeicao-planejamento"
            className="block text-sm font-medium mb-2"
          >
            Refeição
          </label>

          <select
            id="refeicao-planejamento"
            value={refeicaoId}
            onChange={(evento) =>
              alterarRefeicao(evento.target.value)
            }
            className="w-full border border-slate-300 rounded-xl p-3"
          >
            {refeicoes.map((refeicao) => (
              <option
                key={refeicao.id}
                value={refeicao.id}
              >
                {refeicao.nome} — {refeicao.horario}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">
          Receitas para esta refeição
        </h4>

        {receitas.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 p-4 rounded-xl">
            Cadastre primeiro as receitas para poder
            organizar o cardápio.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {receitas.map((receita) => (
              <label
                key={receita.id}
                className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${
                  selecaoAtual.includes(receita.id)
                    ? "border-teal-600 bg-teal-50"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selecaoAtual.includes(receita.id)}
                  onChange={() =>
                    alternarReceita(receita.id)
                  }
                  className="accent-teal-700"
                />

                <div>
                  <p className="font-medium">
                    {receita.nome}
                  </p>

                  <p className="text-xs text-slate-500">
                    Rendimento: {receita.porcoes} porções
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm"
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm flex items-center gap-2"
        >
          <CheckCircle2 size={18} />
          {mensagem}
        </div>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={receitas.length === 0}
        className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl"
      >
        {planejamentoAtual
          ? "Atualizar planejamento"
          : "Salvar planejamento"}
      </button>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList
            size={21}
            className="text-teal-700"
          />

          <h4 className="font-semibold">
            Cardápio planejado para a data
          </h4>
        </div>

        {planejamentosDoDia.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma refeição planejada para esta data.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {refeicoes.map((refeicao) => {
              const planejamento = planejamentosDoDia.find(
                (item) =>
                  item.refeicaoId === refeicao.id
              );

              if (!planejamento) return null;

              const receitasPlanejadas = receitas.filter(
                (receita) =>
                  planejamento.receitasIds.includes(
                    receita.id
                  )
              );

              return (
                <div
                  key={refeicao.id}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed
                          size={17}
                          className="text-teal-700"
                        />

                        <h5 className="font-semibold">
                          {refeicao.nome}
                        </h5>
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {refeicao.horario}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        excluir(planejamento.id)
                      }
                      aria-label={`Excluir planejamento de ${refeicao.nome}`}
                      className="text-red-700 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {receitasPlanejadas.map((receita) => (
                      <li key={receita.id}>
                        • {receita.nome}
                      </li>
                    ))}
                  </ul>

                  {receitasPlanejadas.length === 0 && (
                    <p className="text-sm text-amber-700 mt-3">
                      As receitas deste planejamento não
                      estão mais cadastradas.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Calculator
            size={24}
            className="text-teal-700"
          />

          <div>
            <h4 className="text-lg font-semibold">
              Necessidade de ingredientes
            </h4>

            <p className="text-sm text-slate-500">
              Calcule os ingredientes necessários para
              as receitas planejadas.
            </p>
          </div>
        </div>

        {!planejamentoAtual ? (
          <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
            Salve um planejamento para a refeição
            selecionada antes de calcular os ingredientes.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-teal-800">
                  <Users size={19} />
                  <span className="text-sm font-medium">
                    Estudantes previstos
                  </span>
                </div>

                <p className="text-3xl font-bold text-teal-900 mt-2">
                  {estudantesPrevistos}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Users size={19} />
                  <span className="text-sm font-medium">
                    Frequência confirmada
                  </span>
                </div>

                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {estudantesConfirmados}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="modo-calculo"
                className="block text-sm font-medium mb-2"
              >
                Como deseja calcular as porções?
              </label>

              <select
                id="modo-calculo"
                value={modoCalculo}
                onChange={(evento) =>
                  setModoCalculo(
                    evento.target.value as ModoCalculo
                  )
                }
                className="w-full border border-slate-300 rounded-xl p-3"
              >
                <option value="previstos">
                  Estudantes previstos
                </option>

                <option value="confirmados">
                  Frequência confirmada
                </option>

                <option value="manual">
                  Quantidade manual
                </option>
              </select>
            </div>

            {modoCalculo === "manual" && (
              <div>
                <label
                  htmlFor="porcoes-manuais"
                  className="block text-sm font-medium mb-2"
                >
                  Quantidade de porções
                </label>

                <input
                  id="porcoes-manuais"
                  type="number"
                  min="1"
                  step="1"
                  value={porcoesManuais}
                  onChange={(evento) =>
                    setPorcoesManuais(evento.target.value)
                  }
                  className="w-full border border-slate-300 rounded-xl p-3"
                />
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-500">
                Total de porções para o cálculo
              </p>

              <p className="text-3xl font-bold mt-1">
                {porcoesValidas
                  ? quantidadePorcoes
                  : 0}
              </p>
            </div>

            {!porcoesValidas ? (
              <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-4 rounded-xl text-sm">
                <AlertTriangle size={19} />

                <p>
                  Não há uma quantidade válida de porções.
                  Verifique os estudantes cadastrados,
                  a frequência ou informe uma quantidade
                  manual maior que zero.
                </p>
              </div>
            ) : ingredientesCalculados.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum ingrediente foi encontrado nas
                receitas deste planejamento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">
                        Ingrediente
                      </th>

                      <th className="p-3">
                        Necessário
                      </th>

                      <th className="p-3">
                        Estoque válido
                      </th>

                      <th className="p-3">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ingredientesCalculados.map(
                      (ingrediente) => (
                        <tr
                          key={ingrediente.produtoId}
                          className="border-b border-slate-200"
                        >
                          <td className="p-3 font-medium">
                            {ingrediente.nome}
                          </td>

                          <td className="p-3">
                            {formatarNumero(
                              ingrediente.quantidadeNecessaria
                            )}{" "}
                            {ingrediente.unidade}
                          </td>

                          <td className="p-3">
                            {formatarNumero(
                              ingrediente.estoqueDisponivel
                            )}{" "}
                            {ingrediente.unidade}
                          </td>

                          <td className="p-3">
                            {ingrediente.quantidadeFaltante > 0 ? (
                              <span className="text-red-700 font-medium">
                                Faltam{" "}
                                {formatarNumero(
                                  ingrediente.quantidadeFaltante
                                )}{" "}
                                {ingrediente.unidade}
                              </span>
                            ) : (
                              <span className="text-green-700 font-medium">
                                Suficiente
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-slate-500">
              O cálculo considera apenas lotes com
              validade cadastrada e não vencidos na
              data selecionada. Nenhum produto é
              retirado automaticamente do estoque.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
