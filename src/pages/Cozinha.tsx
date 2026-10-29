
import { useEffect, useState } from "react";
import {
  ChefHat,
  Clock3,
  Users,
  AlertTriangle,
  UtensilsCrossed,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Package,
  Calculator,
  Save,
  History,
} from "lucide-react";

import { useEstudantes } from "../context/EstudantesContext";
import { useFrequencia } from "../context/FrequenciaContext";
import { useRefeicoes } from "../context/RefeicoesContext";
import type { TipoRefeicao } from "../context/RefeicoesContext";
import { useCardapio } from "../context/CardapioContext";
import { useReceitas } from "../context/ReceitasContext";
import { useEstoque } from "../context/EstoqueContext";
import DataBrasileira from "../components/DataBrasileira";

import {
  calcularEstudantesRefeicao,
} from "../utils/calcularEstudantesRefeicao";

const CHAVE_REFEICOES_SERVIDAS = "cape_gestao_refeicoes_servidas_v1";

// Recupera apenas quantidades inteiras e não negativas.
function carregarRefeicoesServidas(): Record<string, number> {
  try {
    const salvo = localStorage.getItem(CHAVE_REFEICOES_SERVIDAS);
    if (!salvo) return {};

    const dados: unknown = JSON.parse(salvo);
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      console.warn("Os registros de refeições servidas são inválidos.");
      return {};
    }

    const registros: Record<string, number> = {};
    for (const [chave, valor] of Object.entries(dados)) {
      if (
        /^\d{4}-\d{2}-\d{2}-(lanche_manha|almoco|lanche_tarde)$/.test(chave) &&
        typeof valor === "number" &&
        Number.isSafeInteger(valor) &&
        valor >= 0
      ) {
        registros[chave] = valor;
      }
    }
    return registros;
  } catch (erro) {
    console.error("Erro ao carregar refeições servidas:", erro);
    return {};
  }
}

type ModoPorcoes = "previstos" | "confirmados" | "manual";

const diasSemana = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function dataLocal(): string {
  const hoje = new Date();

  return (
    `${hoje.getFullYear()}-` +
    `${String(hoje.getMonth() + 1).padStart(2, "0")}-` +
    `${String(hoje.getDate()).padStart(2, "0")}`
  );
}

function formatarDataBR(data: string): string {
  const partes = data.split("-");

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function formatarDataHora(data: string): string {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) return data;

  return valor.toLocaleString("pt-BR");
}

export default function Cozinha() {
  const { estudantes } = useEstudantes();
  const { registros } = useFrequencia();
  const { refeicoes } = useRefeicoes();
  const { planejamentos } = useCardapio();
  const { receitas } = useReceitas();

  const {
    produtos,
    lotes,
    producoes,
    registrarProducao,
  } = useEstoque();

  const [dataSelecionada, setDataSelecionada] =
    useState(dataLocal);

  const [refeicaoSelecionada, setRefeicaoSelecionada] =
    useState<TipoRefeicao>("lanche_manha");

  const [refeicoesServidas, setRefeicoesServidas] =
    useState<Record<string, number>>(carregarRefeicoesServidas);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_REFEICOES_SERVIDAS,
        JSON.stringify(refeicoesServidas)
      );
    } catch (erro) {
      console.error("Erro ao salvar refeições servidas:", erro);
    }
  }, [refeicoesServidas]);

  const [modoPorcoes, setModoPorcoes] =
    useState<ModoPorcoes>("previstos");

  const [porcoesManuais, setPorcoesManuais] =
    useState("1");

  // Guarda os ajustes de consumo separadamente
  // para cada data e refeição.
  const [quantidadesEditadas, setQuantidadesEditadas] =
    useState<Record<string, Record<number, string>>>({});

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const chaveRegistro =
    `${dataSelecionada}-${refeicaoSelecionada}`;

  const dataConsulta = new Date(
    `${dataSelecionada}T12:00:00`
  );

  const diaSemana = Number.isNaN(dataConsulta.getTime())
    ? "Data inválida"
    : diasSemana[dataConsulta.getDay()];

  const refeicaoAtual = refeicoes.find(
    (item) => item.id === refeicaoSelecionada
  );

  const horarioRefeicao = refeicaoAtual?.horario ?? "";

  function contarEstudantes(
    horario: string,
    modo: "previstos" | "confirmados",
    apenasRestricoes = false
  ): number {
    const lista = apenasRestricoes
      ? estudantes.filter(
          (item) => item.restricao === "sim"
        )
      : estudantes;

    return calcularEstudantesRefeicao({
      estudantes: lista,
      registros,
      data: dataSelecionada,
      horarioRefeicao: horario,
      modo,
    });
  }

  const totalPrevistos = contarEstudantes(
    horarioRefeicao,
    "previstos"
  );

  const totalConfirmados = contarEstudantes(
    horarioRefeicao,
    "confirmados"
  );

  const totalRestricoes = contarEstudantes(
    horarioRefeicao,
    "previstos",
    true
  );

  const planejamentoAtual = planejamentos.find(
    (item) =>
      item.data === dataSelecionada &&
      item.refeicaoId === refeicaoSelecionada
  );

  const receitasPlanejadas = receitas.filter(
    (receita) =>
      planejamentoAtual?.receitasIds.includes(receita.id)
  );

  const quantidadePorcoes =
    modoPorcoes === "previstos"
      ? totalPrevistos
      : modoPorcoes === "confirmados"
        ? totalConfirmados
        : Number(porcoesManuais);

  const porcoesValidas =
    Number.isInteger(quantidadePorcoes) &&
    quantidadePorcoes > 0;

  // Consolida os ingredientes de todas as receitas.
  const ingredientesAgrupados = new Map<number, number>();

  if (porcoesValidas) {
    receitasPlanejadas.forEach((receita) => {
      if (receita.porcoes <= 0) return;

      receita.ingredientes.forEach((ingrediente) => {
        const quantidade =
          (ingrediente.quantidade / receita.porcoes) *
          quantidadePorcoes;

        const anterior =
          ingredientesAgrupados.get(ingrediente.produtoId) ?? 0;

        ingredientesAgrupados.set(
          ingrediente.produtoId,
          anterior + quantidade
        );
      });
    });
  }

  const ingredientesCalculados = Array.from(
    ingredientesAgrupados.entries()
  ).map(([produtoId, quantidadeCalculada]) => {
    const produto = produtos.find(
      (item) => item.id === produtoId
    );

    const estoqueValido = lotes
      .filter(
        (lote) =>
          lote.produtoId === produtoId &&
          lote.quantidade > 0 &&
          lote.validade !== "" &&
          lote.validade >= dataLocal()
      )
      .reduce(
        (total, lote) => total + lote.quantidade,
        0
      );

    return {
      produtoId,
      nome: produto?.nome ?? "Produto não encontrado",
      unidade: produto?.unidade ?? "",
      produtoExiste: Boolean(produto),
      quantidadeCalculada,
      estoqueValido,
    };
  });

  const ajustesAtuais =
    quantidadesEditadas[chaveRegistro] ?? {};

  const ingredientesParaProducao =
    ingredientesCalculados.map((ingrediente) => {
      const valorEditado =
        ajustesAtuais[ingrediente.produtoId];

      const quantidade =
        valorEditado === undefined
          ? ingrediente.quantidadeCalculada
          : valorEditado.trim() === ""
            ? NaN
            : Number(valorEditado);

      return {
        ...ingrediente,
        quantidade,
        faltante: Math.max(
          0,
          quantidade - ingrediente.estoqueValido
        ),
      };
    });

  const quantidadesValidas =
    ingredientesParaProducao.length > 0 &&
    ingredientesParaProducao.every(
      (item) =>
        item.produtoExiste &&
        Number.isFinite(item.quantidade) &&
        item.quantidade > 0
    );

  const estoqueSuficiente =
    quantidadesValidas &&
    ingredientesParaProducao.every(
      (item) =>
        item.quantidade <= item.estoqueValido + 1e-9
    );

  const producaoRegistrada = producoes.find(
    (item) =>
      item.data === dataSelecionada &&
      item.refeicaoId === refeicaoSelecionada
  );

  const producoesDoDia = producoes.filter(
    (item) => item.data === dataSelecionada
  );

  const podeConfirmar =
    dataSelecionada === dataLocal() &&
    !producaoRegistrada &&
    Boolean(planejamentoAtual) &&
    porcoesValidas &&
    quantidadesValidas &&
    estoqueSuficiente;

  const quantidadeServida =
    refeicoesServidas[chaveRegistro] ?? 0;

  const estudantesComRestricao = estudantes.filter(
    (estudante) => {
      if (
        !estudante.ativo ||
        estudante.restricao !== "sim"
      ) {
        return false;
      }

      const previsto = calcularEstudantesRefeicao({
        estudantes: [estudante],
        registros,
        data: dataSelecionada,
        horarioRefeicao,
        modo: "previstos",
      });

      const confirmado = calcularEstudantesRefeicao({
        estudantes: [estudante],
        registros,
        data: dataSelecionada,
        horarioRefeicao,
        modo: "confirmados",
      });

      return previsto > 0 || confirmado > 0;
    }
  );

  function alterarData(novaData: string) {
    setDataSelecionada(novaData);
    setMensagem("");
    setErro("");
  }

  function alterarRefeicao(novaRefeicao: TipoRefeicao) {
    setRefeicaoSelecionada(novaRefeicao);
    setMensagem("");
    setErro("");
  }

  function atualizarQuantidadeServida(valor: number) {
    if (!Number.isFinite(valor)) return;

    setRefeicoesServidas((anterior) => ({
      ...anterior,
      [chaveRegistro]: Math.max(0, Math.floor(valor)),
    }));
  }

  function atualizarIngrediente(
    produtoId: number,
    valor: string
  ) {
    setQuantidadesEditadas((anterior) => ({
      ...anterior,
      [chaveRegistro]: {
        ...(anterior[chaveRegistro] ?? {}),
        [produtoId]: valor,
      },
    }));

    setMensagem("");
    setErro("");
  }

  function restaurarQuantidades() {
    setQuantidadesEditadas((anterior) => {
      const atualizado = { ...anterior };
      delete atualizado[chaveRegistro];
      return atualizado;
    });

    setMensagem("");
    setErro("");
  }

  function confirmarProducao() {
    setMensagem("");
    setErro("");

    if (producaoRegistrada) {
      setErro(
        "Esta refeição já possui uma produção confirmada."
      );
      return;
    }

    if (dataSelecionada !== dataLocal()) {
      setErro(
        "A baixa de ingredientes só pode ser realizada na data atual."
      );
      return;
    }

    if (!planejamentoAtual || !porcoesValidas) {
      setErro(
        "Confira o cardápio e a quantidade de porções."
      );
      return;
    }

    if (!quantidadesValidas) {
      setErro(
        "Confira os produtos e as quantidades utilizadas."
      );
      return;
    }

    if (!estoqueSuficiente) {
      setErro(
        "Existem ingredientes com estoque insuficiente."
      );
      return;
    }

    const confirmado = window.confirm(
      `Confirmar a produção de ${quantidadePorcoes} ` +
      `porções de ${refeicaoAtual?.nome ?? "refeição"}?\n\n` +
      "Os ingredientes informados serão retirados " +
      "do estoque e esta operação não poderá ser " +
      "confirmada novamente para a mesma refeição."
    );

    if (!confirmado) return;

    const resultado = registrarProducao(
      dataSelecionada,
      refeicaoSelecionada,
      quantidadePorcoes,
      ingredientesParaProducao.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
      }))
    );

    if (resultado.sucesso) {
      setMensagem(resultado.mensagem);
    } else {
      setErro(resultado.mensagem);
    }
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ChefHat
            className="text-teal-700"
            size={28}
          />

          <h2 className="text-2xl font-bold">
            Gestão da Cozinha
          </h2>
        </div>

        <p className="text-slate-500">
          Planejamento, produção e acompanhamento
          das refeições oferecidas aos estudantes
          do CAPE.
        </p>

        <p className="text-xs text-amber-700 mt-2">
          Ambiente de testes. Utilize apenas dados fictícios.
        </p>
      </div>

      {/* DATA */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <label
          htmlFor="data-cozinha"
          className="block text-sm font-medium mb-2"
        >
          Data de atendimento
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <DataBrasileira
            id="data-cozinha"
            value={dataSelecionada}
            onChange={alterarData}
          />

          <span className="text-sm text-slate-600">
            {formatarDataBR(dataSelecionada)}
          </span>

          <span className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={17} />
            {diaSemana}
          </span>
        </div>
      </section>

      {/* REFEIÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {refeicoes.map((refeicao) => {
          const previstos = contarEstudantes(
            refeicao.horario,
            "previstos"
          );

          const planejada = planejamentos.some(
            (item) =>
              item.data === dataSelecionada &&
              item.refeicaoId === refeicao.id
          );

          const produzida = producoes.some(
            (item) =>
              item.data === dataSelecionada &&
              item.refeicaoId === refeicao.id
          );

          return (
            <button
              key={refeicao.id}
              type="button"
              onClick={() =>
                alterarRefeicao(refeicao.id)
              }
              className={`text-left p-5 rounded-2xl border transition ${
                refeicaoSelecionada === refeicao.id
                  ? "bg-teal-50 border-teal-600"
                  : "bg-white border-slate-200 hover:border-teal-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <UtensilsCrossed
                  className="text-teal-700"
                  size={23}
                />

                {refeicaoSelecionada === refeicao.id && (
                  <CheckCircle2
                    className="text-teal-700"
                    size={20}
                  />
                )}
              </div>

              <h3 className="font-semibold mt-4">
                {refeicao.nome}
              </h3>

              <p className="text-sm text-slate-500 flex items-center gap-2 mt-2">
                <Clock3 size={16} />
                {refeicao.horario}
              </p>

              <p className="text-sm font-medium text-teal-800 mt-3">
                {previstos} estudante(s) previsto(s)
              </p>

              <p className="text-xs text-slate-500 mt-2">
                {produzida
                  ? "Produção confirmada"
                  : planejada
                    ? "Cardápio planejado"
                    : "Cardápio não planejado"}
              </p>
            </button>
          );
        })}
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <Users className="text-teal-700 mb-3" />

          <p className="text-sm text-slate-500">
            Estudantes previstos
          </p>

          <p className="text-3xl font-bold mt-1">
            {totalPrevistos}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <ChefHat className="text-teal-700 mb-3" />

          <p className="text-sm text-slate-500">
            Presença confirmada no horário
          </p>

          <p className="text-3xl font-bold mt-1">
            {totalConfirmados}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <AlertTriangle className="text-amber-600 mb-3" />

          <p className="text-sm text-slate-500">
            Restrições entre os previstos
          </p>

          <p className="text-3xl font-bold mt-1">
            {totalRestricoes}
          </p>
        </div>
      </div>

      {/* CARDÁPIO */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList
            size={23}
            className="text-teal-700"
          />

          <div>
            <h3 className="text-lg font-semibold">
              Cardápio da refeição
            </h3>

            <p className="text-sm text-slate-500">
              {refeicaoAtual?.nome} —{" "}
              {formatarDataBR(dataSelecionada)}
            </p>
          </div>
        </div>

        {!planejamentoAtual ? (
          <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
            Ainda não existe cardápio planejado para
            esta refeição. Acesse o módulo Cardápio
            para cadastrar as receitas.
          </p>
        ) : receitasPlanejadas.length === 0 ? (
          <p className="text-sm text-amber-700">
            As receitas deste planejamento não estão
            mais cadastradas.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {receitasPlanejadas.map((receita) => (
              <div
                key={receita.id}
                className="border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed
                    size={18}
                    className="text-teal-700"
                  />

                  <h4 className="font-semibold">
                    {receita.nome}
                  </h4>
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Rendimento da receita:{" "}
                  {receita.porcoes} porções
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PRODUÇÃO */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Calculator
            size={24}
            className="text-teal-700"
          />

          <div>
            <h3 className="text-lg font-semibold">
              Controle de produção e consumo
            </h3>

            <p className="text-sm text-slate-500">
              Confira as porções e os ingredientes
              utilizados antes de confirmar a produção.
            </p>
          </div>
        </div>

        {producaoRegistrada ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 size={21} />

              <p className="font-semibold">
                Produção confirmada
              </p>
            </div>

            <p className="text-sm text-green-800 mt-2">
              {producaoRegistrada.porcoesProduzidas} porções
              registradas em{" "}
              {formatarDataHora(
                producaoRegistrada.registradoEm
              )}.
            </p>

            <p className="text-xs text-green-800 mt-2">
              Os ingredientes foram baixados do estoque.
              Uma nova confirmação para esta refeição
              está bloqueada.
            </p>

            <div className="mt-4 space-y-2">
              {producaoRegistrada.ingredientes.map(
                (ingrediente) => {
                  const produto = produtos.find(
                    (item) =>
                      item.id === ingrediente.produtoId
                  );

                  return (
                    <p
                      key={ingrediente.produtoId}
                      className="text-sm text-green-950"
                    >
                      • {produto?.nome ?? `Produto ${ingrediente.produtoId}`}:{" "}
                      {formatarNumero(
                        ingrediente.quantidade
                      )}{" "}
                      {produto?.unidade ?? ""}
                    </p>
                  );
                }
              )}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor="modo-porcoes-cozinha"
                className="block text-sm font-medium mb-2"
              >
                Base para calcular as porções
              </label>

              <select
                id="modo-porcoes-cozinha"
                value={modoPorcoes}
                onChange={(evento) => {
                  setModoPorcoes(
                    evento.target.value as ModoPorcoes
                  );
                  setMensagem("");
                  setErro("");
                }}
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

            {modoPorcoes === "manual" && (
              <div>
                <label
                  htmlFor="porcoes-manuais-cozinha"
                  className="block text-sm font-medium mb-2"
                >
                  Quantidade de porções
                </label>

                <input
                  id="porcoes-manuais-cozinha"
                  type="number"
                  min="1"
                  step="1"
                  value={porcoesManuais}
                  onChange={(evento) => {
                    setPorcoesManuais(evento.target.value);
                    setMensagem("");
                    setErro("");
                  }}
                  className="w-full border border-slate-300 rounded-xl p-3"
                />
              </div>
            )}

            <div className="bg-teal-50 border border-teal-100 rounded-xl p-5">
              <p className="text-sm text-teal-800">
                Porções planejadas para produção
              </p>

              <p className="text-3xl font-bold text-teal-900 mt-2">
                {porcoesValidas ? quantidadePorcoes : 0}
              </p>

              <p className="text-xs text-teal-800 mt-2">
                O cálculo considera essa quantidade
                para cada receita selecionada.
              </p>
            </div>

            {!planejamentoAtual ? (
              <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                Cadastre um cardápio antes de confirmar
                a produção.
              </p>
            ) : !porcoesValidas ? (
              <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                Informe uma quantidade válida de porções
                para continuar.
              </p>
            ) : ingredientesParaProducao.length === 0 ? (
              <p className="text-sm text-amber-800">
                Não foram encontrados ingredientes
                para esta produção.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package
                      size={21}
                      className="text-teal-700"
                    />

                    <h4 className="font-semibold">
                      Conferência dos ingredientes
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={restaurarQuantidades}
                    className="text-sm text-teal-700 hover:underline"
                  >
                    Restaurar quantidades calculadas
                  </button>
                </div>

                <p className="text-sm text-slate-500">
                  Ajuste a coluna "Quantidade utilizada"
                  caso o consumo real tenha sido diferente
                  do cálculo previsto.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3">
                          Ingrediente
                        </th>

                        <th className="p-3">
                          Calculado
                        </th>

                        <th className="p-3">
                          Quantidade utilizada
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
                      {ingredientesParaProducao.map(
                        (ingrediente) => {
                          const valorDigitado =
                            ajustesAtuais[
                              ingrediente.produtoId
                            ];

                          const valorCampo =
                            valorDigitado === undefined
                              ? String(
                                  ingrediente.quantidadeCalculada
                                )
                              : valorDigitado;

                          const quantidadeValida =
                            Number.isFinite(
                              ingrediente.quantidade
                            ) &&
                            ingrediente.quantidade > 0;

                          return (
                            <tr
                              key={ingrediente.produtoId}
                              className="border-b border-slate-200"
                            >
                              <td className="p-3 font-medium">
                                {ingrediente.nome}
                              </td>

                              <td className="p-3">
                                {formatarNumero(
                                  ingrediente.quantidadeCalculada
                                )}{" "}
                                {ingrediente.unidade}
                              </td>

                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0.000001"
                                    step="any"
                                    value={valorCampo}
                                    onChange={(evento) =>
                                      atualizarIngrediente(
                                        ingrediente.produtoId,
                                        evento.target.value
                                      )
                                    }
                                    aria-label={`Quantidade utilizada de ${ingrediente.nome}`}
                                    className="border border-slate-300 rounded-lg p-2 w-28"
                                  />

                                  <span className="text-slate-500">
                                    {ingrediente.unidade}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3">
                                {formatarNumero(
                                  ingrediente.estoqueValido
                                )}{" "}
                                {ingrediente.unidade}
                              </td>

                              <td className="p-3">
                                {!ingrediente.produtoExiste ? (
                                  <span className="text-red-700">
                                    Produto não cadastrado
                                  </span>
                                ) : !quantidadeValida ? (
                                  <span className="text-red-700">
                                    Quantidade inválida
                                  </span>
                                ) : ingrediente.faltante > 1e-9 ? (
                                  <span className="text-red-700 font-medium">
                                    Faltam{" "}
                                    {formatarNumero(
                                      ingrediente.faltante
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
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                {!estoqueSuficiente && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-900">
                      <AlertTriangle size={19} />

                      <p className="font-semibold">
                        Produção ainda não pode ser confirmada
                      </p>
                    </div>

                    <p className="text-sm text-amber-800 mt-2">
                      Verifique as quantidades e a
                      disponibilidade de todos os ingredientes.
                      Nenhum produto será baixado enquanto
                      houver inconsistências.
                    </p>
                  </div>
                )}

                {dataSelecionada !== dataLocal() && (
                  <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                    A baixa de estoque está disponível
                    apenas para a data atual.
                  </p>
                )}

                <button
                  type="button"
                  onClick={confirmarProducao}
                  disabled={!podeConfirmar}
                  className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl"
                >
                  <Save size={19} />
                  Confirmar produção e baixar ingredientes
                </button>

                <p className="text-xs text-slate-500">
                  A confirmação registra a saída dos
                  ingredientes por lote, respeitando
                  a ordem de vencimento (PVPS).
                  A operação não pode ser repetida
                  para a mesma refeição e data.
                </p>
              </>
            )}
          </>
        )}

        {erro && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm"
          >
            {erro}
          </div>
        )}

        {mensagem && (
          <div
            role="status"
            className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm flex items-center gap-2"
          >
            <CheckCircle2 size={19} />
            {mensagem}
          </div>
        )}
      </section>

      {/* REFEIÇÕES SERVIDAS */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-2">
          Controle de refeições servidas
        </h3>

        <p className="text-sm text-slate-500 mb-4">
          Informe a quantidade efetivamente distribuída
          nesta refeição.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="number"
            min="0"
            step="1"
            value={quantidadeServida}
            onChange={(evento) =>
              atualizarQuantidadeServida(
                Number(evento.target.value)
              )
            }
            aria-label="Quantidade de refeições servidas"
            className="border border-slate-300 rounded-xl p-3 w-36 text-lg font-semibold"
          />

          <span className="text-sm text-slate-500">
            {refeicaoAtual?.nome} —{" "}
            {formatarDataBR(dataSelecionada)}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          O registro de refeições distribuídas é
          independente da confirmação de produção
          e não gera outra baixa de estoque.
        </p>
      </section>

      {/* HISTÓRICO */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <History
            size={23}
            className="text-teal-700"
          />

          <h3 className="text-lg font-semibold">
            Histórico de produções do dia
          </h3>
        </div>

        {producoesDoDia.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma produção confirmada para esta data.
          </p>
        ) : (
          <div className="space-y-3">
            {producoesDoDia.map((producao) => {
              const refeicao = refeicoes.find(
                (item) =>
                  item.id === producao.refeicaoId
              );

              return (
                <div
                  key={producao.id}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {refeicao?.nome ??
                        producao.refeicaoId}
                    </p>

                    <span className="text-sm text-green-700 font-medium">
                      <CheckCircle2
                        size={16}
                        className="inline mr-1"
                      />
                      Confirmada
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mt-2">
                    {producao.porcoesProduzidas} porções
                    produzidas
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Registrada em{" "}
                    {formatarDataHora(
                      producao.registradoEm
                    )}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {producao.ingredientes.length} produto(s)
                    utilizados
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RESTRIÇÕES ALIMENTARES */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle
            className="text-amber-600"
            size={22}
          />

          <h3 className="text-lg font-semibold">
            Atenção às restrições alimentares
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Estudantes previstos ou com presença
          confirmada para esta refeição que possuem
          restrições alimentares cadastradas.
        </p>

        {estudantesComRestricao.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma restrição alimentar cadastrada
            entre os estudantes previstos ou confirmados.
          </p>
        ) : (
          <div className="space-y-3">
            {estudantesComRestricao.map((estudante) => {
              const confirmado =
                calcularEstudantesRefeicao({
                  estudantes: [estudante],
                  registros,
                  data: dataSelecionada,
                  horarioRefeicao,
                  modo: "confirmados",
                }) > 0;

              return (
                <div
                  key={estudante.id}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-amber-950">
                      {estudante.nome}
                    </p>

                    <span className="text-xs text-amber-900">
                      {confirmado
                        ? "Presença confirmada no horário"
                        : "Presença não confirmada no horário"}
                    </span>
                  </div>

                  <p className="text-sm mt-2">
                    <strong>Tipo de restrição:</strong>{" "}
                    {estudante.tipoRestricao ||
                      "Não informado"}
                  </p>

                  <p className="text-sm mt-1">
                    <strong>Alimentos a evitar:</strong>{" "}
                    {estudante.alimentosEvitar ||
                      "Não informado"}
                  </p>

                  {estudante.orientacoes && (
                    <p className="text-sm mt-1">
                      <strong>Orientações:</strong>{" "}
                      {estudante.orientacoes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-amber-800 mt-4">
          A equipe deve conferir individualmente as
          restrições e orientações alimentares antes
          do preparo e da distribuição. O sistema
          ainda não verifica automaticamente a
          segurança de cada receita.
        </p>
      </section>
    </div>
  );
}
