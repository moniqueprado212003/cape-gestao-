
import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  ChefHat,
  CheckCircle2,
  Calculator,
  AlertTriangle,
} from "lucide-react";

import { useEstoque } from "../context/EstoqueContext";
import { useReceitas } from "../context/ReceitasContext";
import { useFrequencia } from "../context/FrequenciaContext";
import { useEstudantes } from "../context/EstudantesContext";
import DataBrasileira from "../components/DataBrasileira";
import PlanejamentoCardapio from "../components/PlanejamentoCardapio";

type IngredienteFormulario = {
  produtoId: string;
  quantidade: string;
};

type ModoCalculo = "manual" | "frequencia";

function dataHoje(): string {
  const hoje = new Date();

  return [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatarNumero(numero: number): string {
  return Number(numero.toFixed(3)).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export default function Cardapio() {
  const { produtos, lotes } = useEstoque();
  const { receitas, adicionarReceita, excluirReceita } =
    useReceitas();
  const { registros } = useFrequencia();
  const { estudantes } = useEstudantes();

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [nome, setNome] = useState("");
  const [porcoes, setPorcoes] = useState("");
  const [modoPreparo, setModoPreparo] = useState("");

  const [ingredientes, setIngredientes] = useState<
    IngredienteFormulario[]
  >([{ produtoId: "", quantidade: "" }]);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [receitaSelecionada, setReceitaSelecionada] =
    useState("");
  const [modoCalculo, setModoCalculo] =
    useState<ModoCalculo>("manual");
  const [porcoesManuais, setPorcoesManuais] =
    useState("50");
  const [dataCalculo, setDataCalculo] =
    useState(dataHoje());

  const receitaCalculo = receitas.find(
    (receita) => String(receita.id) === receitaSelecionada
  );

  const presentes = new Set(
    registros
      .filter(
        (registro) =>
          registro.data === dataCalculo &&
          registro.entradaReal !== null &&
          registro.saidaReal === null
      )
      .map((registro) => registro.estudanteId)
  );

  const quantidadePresentes = estudantes.filter(
    (estudante) =>
      estudante.ativo && presentes.has(estudante.id)
  ).length;

  const quantidadePorcoes =
    modoCalculo === "manual"
      ? Number(porcoesManuais)
      : quantidadePresentes;

  const quantidadeValida =
    Number.isInteger(quantidadePorcoes) &&
    quantidadePorcoes > 0;

  function adicionarIngrediente() {
    setIngredientes((anterior) => [
      ...anterior,
      { produtoId: "", quantidade: "" },
    ]);
  }

  function atualizarIngrediente(
    indice: number,
    campo: keyof IngredienteFormulario,
    valor: string
  ) {
    setIngredientes((anterior) =>
      anterior.map((ingrediente, posicao) =>
        posicao === indice
          ? { ...ingrediente, [campo]: valor }
          : ingrediente
      )
    );
  }

  function removerIngrediente(indice: number) {
    setIngredientes((anterior) =>
      anterior.filter((_, posicao) => posicao !== indice)
    );
  }

  function limparFormulario() {
    setNome("");
    setPorcoes("");
    setModoPreparo("");
    setIngredientes([{ produtoId: "", quantidade: "" }]);
  }

  function salvarReceita(evento: FormEvent) {
    evento.preventDefault();
    setMensagem("");
    setErro("");

    const numeroPorcoes = Number(porcoes);

    if (
      !nome.trim() ||
      !Number.isInteger(numeroPorcoes) ||
      numeroPorcoes <= 0
    ) {
      setErro("Informe o nome e o número de porções.");
      return;
    }

    if (ingredientes.length === 0) {
      setErro("Adicione pelo menos um ingrediente.");
      return;
    }

    const convertidos = ingredientes.map((ingrediente) => ({
      produtoId: Number(ingrediente.produtoId),
      quantidade: Number(ingrediente.quantidade),
    }));

    const validos = ingredientes.every(
      (ingrediente, indice) =>
        ingrediente.produtoId !== "" &&
        ingrediente.quantidade.trim() !== "" &&
        produtos.some(
          (produto) =>
            produto.id === convertidos[indice].produtoId
        ) &&
        Number.isFinite(convertidos[indice].quantidade) &&
        convertidos[indice].quantidade > 0
    );

    if (!validos) {
      setErro("Preencha corretamente todos os ingredientes.");
      return;
    }

    const ids = convertidos.map(
      (ingrediente) => ingrediente.produtoId
    );

    if (new Set(ids).size !== ids.length) {
      setErro("Não repita o mesmo ingrediente na receita.");
      return;
    }

    adicionarReceita({
      nome: nome.trim(),
      porcoes: numeroPorcoes,
      ingredientes: convertidos,
      modoPreparo: modoPreparo.trim(),
    });

    limparFormulario();
    setMostrarFormulario(false);
    setMensagem("Receita cadastrada com sucesso!");
  }

  function excluir(id: number) {
    if (!window.confirm("Deseja excluir esta receita?")) {
      return;
    }

    excluirReceita(id);

    if (receitaSelecionada === String(id)) {
      setReceitaSelecionada("");
    }

    setMensagem("Receita excluída.");
  }

  const resultadoIngredientes =
    receitaCalculo && quantidadeValida
      ? receitaCalculo.ingredientes.map((ingrediente) => {
          const produto = produtos.find(
            (item) => item.id === ingrediente.produtoId
          );

          const necessario =
            (ingrediente.quantidade /
              receitaCalculo.porcoes) *
            quantidadePorcoes;

          const lotesProduto = lotes.filter(
            (lote) =>
              lote.produtoId === ingrediente.produtoId &&
              lote.quantidade > 0
          );

          const saldoValido = lotesProduto
            .filter(
              (lote) =>
                lote.validade !== "" &&
                lote.validade >= dataCalculo
            )
            .reduce(
              (total, lote) => total + lote.quantidade,
              0
            );

          const saldoVencido = lotesProduto
            .filter(
              (lote) =>
                lote.validade !== "" &&
                lote.validade < dataCalculo
            )
            .reduce(
              (total, lote) => total + lote.quantidade,
              0
            );

          const saldoSemValidade = lotesProduto
            .filter((lote) => !lote.validade)
            .reduce(
              (total, lote) => total + lote.quantidade,
              0
            );

          return {
            produto,
            produtoId: ingrediente.produtoId,
            necessario,
            saldoValido,
            saldoVencido,
            saldoSemValidade,
            falta: Math.max(0, necessario - saldoValido),
          };
        })
      : [];

  const ingredientesInsuficientes =
    resultadoIngredientes.filter(
      (item) => item.falta > 0.000001
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Cardápio e Receitas
          </h2>

          <p className="text-slate-500 mt-1">
            Cadastre receitas e calcule os ingredientes
            necessários para as refeições do CAPE.
          </p>

          <p className="text-xs text-amber-700 mt-2">
            Ambiente de testes. Utilize apenas dados fictícios.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMostrarFormulario(true);
            setMensagem("");
            setErro("");
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus size={19} />
          Nova receita
        </button>
      </div>

      {mensagem && (
        <div
          role="status"
          className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center gap-2"
        >
          <CheckCircle2 size={19} />
          {mensagem}
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4"
        >
          {erro}
        </div>
      )}

      {mostrarFormulario && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold">
              Cadastrar receita
            </h3>

            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(false);
                limparFormulario();
              }}
              aria-label="Fechar formulário"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={salvarReceita} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nome-receita"
                  className="block text-sm font-medium mb-2"
                >
                  Nome da receita *
                </label>

                <input
                  id="nome-receita"
                  required
                  value={nome}
                  onChange={(evento) =>
                    setNome(evento.target.value)
                  }
                  placeholder="Ex.: Arroz branco cozido"
                  className="w-full border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="porcoes-receita"
                  className="block text-sm font-medium mb-2"
                >
                  Rendimento (porções) *
                </label>

                <input
                  id="porcoes-receita"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={porcoes}
                  onChange={(evento) =>
                    setPorcoes(evento.target.value)
                  }
                  className="w-full border border-slate-300 rounded-xl p-3"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h4 className="font-semibold">Ingredientes</h4>

                <button
                  type="button"
                  onClick={adicionarIngrediente}
                  className="text-teal-700 font-medium flex items-center gap-2"
                >
                  <Plus size={17} />
                  Adicionar ingrediente
                </button>
              </div>

              {produtos.length === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl mb-4">
                  Cadastre primeiro os insumos no Estoque.
                </p>
              )}

              <div className="space-y-3">
                {ingredientes.map((ingrediente, indice) => {
                  const selecionado = produtos.find(
                    (produto) =>
                      String(produto.id) ===
                      ingrediente.produtoId
                  );

                  return (
                    <div
                      key={indice}
                      className="grid grid-cols-1 md:grid-cols-[1fr_180px_44px] gap-3 items-end"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Insumo
                        </label>

                        <select
                          required
                          value={ingrediente.produtoId}
                          onChange={(evento) =>
                            atualizarIngrediente(
                              indice,
                              "produtoId",
                              evento.target.value
                            )
                          }
                          className="w-full border border-slate-300 rounded-xl p-3"
                        >
                          <option value="">
                            Selecione um insumo
                          </option>

                          {produtos.map((produto) => (
                            <option
                              key={produto.id}
                              value={produto.id}
                            >
                              {produto.nome} ({produto.unidade})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Quantidade{" "}
                          {selecionado
                            ? `(${selecionado.unidade})`
                            : ""}
                        </label>

                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={ingrediente.quantidade}
                          onChange={(evento) =>
                            atualizarIngrediente(
                              indice,
                              "quantidade",
                              evento.target.value
                            )
                          }
                          className="w-full border border-slate-300 rounded-xl p-3"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removerIngrediente(indice)
                        }
                        aria-label="Remover ingrediente"
                        className="border border-red-200 text-red-700 rounded-xl p-3 flex justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="modo-preparo"
                className="block text-sm font-medium mb-2"
              >
                Modo de preparo (opcional)
              </label>

              <textarea
                id="modo-preparo"
                rows={4}
                value={modoPreparo}
                onChange={(evento) =>
                  setModoPreparo(evento.target.value)
                }
                className="w-full border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 rounded-xl"
              >
                Salvar receita
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  limparFormulario();
                }}
                className="border border-slate-300 rounded-xl px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
<PlanejamentoCardapio />
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Calculator size={25} className="text-teal-700" />

          <div>
            <h3 className="text-lg font-semibold">
              Calculadora de ingredientes
            </h3>

            <p className="text-sm text-slate-500">
              Planeje as quantidades e confira o estoque.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="receita-calculo"
              className="block text-sm font-medium mb-2"
            >
              Receita
            </label>

            <select
              id="receita-calculo"
              value={receitaSelecionada}
              onChange={(evento) =>
                setReceitaSelecionada(evento.target.value)
              }
              className="w-full border border-slate-300 rounded-xl p-3"
            >
              <option value="">Selecione uma receita</option>

              {receitas.map((receita) => (
                <option key={receita.id} value={receita.id}>
                  {receita.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="data-calculo"
              className="block text-sm font-medium mb-2"
            >
              Data do planejamento
            </label>

            <DataBrasileira
              id="data-calculo"
              value={dataCalculo}
              onChange={setDataCalculo}
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium mb-3">
            Como definir as porções?
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="modo-calculo"
                checked={modoCalculo === "manual"}
                onChange={() => setModoCalculo("manual")}
              />
              Quantidade manual
            </label>

            <label className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="modo-calculo"
                checked={modoCalculo === "frequencia"}
                onChange={() => setModoCalculo("frequencia")}
              />
              Pela frequência registrada
            </label>
          </div>
        </div>

        {modoCalculo === "manual" ? (
          <div className="mt-5 max-w-sm">
            <label
              htmlFor="porcoes-calculo"
              className="block text-sm font-medium mb-2"
            >
              Quantidade de porções desejadas
            </label>

            <input
              id="porcoes-calculo"
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
        ) : (
          <div className="mt-5 bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-sm text-teal-800">
              Estudantes presentes na data selecionada
            </p>

            <p className="text-3xl font-bold text-teal-900 mt-1">
              {quantidadePresentes}
            </p>

            <p className="text-xs text-teal-800 mt-2">
              Considera estudantes ativos com entrada
              registrada e sem saída registrada.
              Não representa a previsão de frequência
              para datas futuras.
            </p>
          </div>
        )}

        {receitaCalculo && quantidadeValida && (
          <div className="mt-6">
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-semibold">
                {receitaCalculo.nome}
              </p>

              <p className="text-sm text-slate-600 mt-1">
                Receita original: {receitaCalculo.porcoes} porções
                {" • "}
                Planejamento: {quantidadePorcoes} porções
              </p>
            </div>

            {ingredientesInsuficientes > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-4 text-sm">
                <AlertTriangle size={19} className="shrink-0" />

                <p>
                  {ingredientesInsuficientes} ingrediente(s)
                  apresentam saldo válido insuficiente.
                  Verifique a necessidade de reposição.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Ingrediente</th>
                    <th className="p-3">Necessário</th>
                    <th className="p-3">Saldo válido</th>
                    <th className="p-3">Falta</th>
                    <th className="p-3">Situação</th>
                  </tr>
                </thead>

                <tbody>
                  {resultadoIngredientes.map((item) => (
                    <tr
                      key={item.produtoId}
                      className="border-b border-slate-200"
                    >
                      <td className="p-3 font-medium">
                        {item.produto?.nome ??
                          "Insumo não encontrado"}
                      </td>

                      <td className="p-3">
                        {formatarNumero(item.necessario)}{" "}
                        {item.produto?.unidade ?? ""}
                      </td>

                      <td className="p-3">
                        {formatarNumero(item.saldoValido)}{" "}
                        {item.produto?.unidade ?? ""}
                      </td>

                      <td className="p-3">
                        {formatarNumero(item.falta)}{" "}
                        {item.produto?.unidade ?? ""}
                      </td>

                      <td className="p-3">
                        {item.falta <= 0.000001 ? (
                          <span className="text-green-700 font-medium">
                            Suficiente
                          </span>
                        ) : (
                          <span className="text-red-700 font-medium">
                            Reposição necessária
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-2">
              {resultadoIngredientes
                .filter(
                  (item) =>
                    item.saldoVencido > 0 ||
                    item.saldoSemValidade > 0
                )
                .map((item) => (
                  <p
                    key={item.produtoId}
                    className="text-xs text-amber-800"
                  >
                    {item.produto?.nome ?? "Insumo"}:
                    {" "}
                    {formatarNumero(item.saldoVencido)}{" "}
                    {item.produto?.unidade ?? ""}
                    {" "}em lotes vencidos e{" "}
                    {formatarNumero(item.saldoSemValidade)}{" "}
                    {item.produto?.unidade ?? ""}
                    {" "}sem validade informada.
                    Essas quantidades não foram consideradas
                    disponíveis.
                  </p>
                ))}
            </div>

            <p className="text-xs text-slate-500 mt-4">
              O saldo válido é calculado com base nos lotes
              cuja validade é igual ou posterior à data
              selecionada. O cálculo não reserva nem
              desconta ingredientes do estoque.
            </p>
          </div>
        )}

        {receitaCalculo && !quantidadeValida && (
          <p className="text-sm text-amber-800 mt-5">
            Informe uma quantidade de porções maior que zero
            ou registre a presença dos estudantes.
          </p>
        )}

        {!receitaCalculo && (
          <p className="text-sm text-slate-500 mt-5">
            Selecione uma receita cadastrada para visualizar
            o cálculo dos ingredientes.
          </p>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <BookOpen size={22} className="text-teal-700" />

          <h3 className="text-lg font-semibold">
            Receitas cadastradas
          </h3>
        </div>

        {receitas.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <ChefHat
              size={38}
              className="mx-auto mb-3 text-slate-400"
            />
            <p>Nenhuma receita cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receitas.map((receita) => (
              <div
                key={receita.id}
                className="border border-slate-200 rounded-xl p-5"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {receita.nome}
                    </h4>

                    <p className="text-sm text-slate-500 mt-1">
                      Rendimento: {receita.porcoes} porções
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => excluir(receita.id)}
                    aria-label={`Excluir ${receita.nome}`}
                    className="text-red-700 border border-red-200 rounded-xl p-2 self-start"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <h5 className="text-sm font-semibold mt-4 mb-2">
                  Ingredientes
                </h5>

                <ul className="space-y-2 text-sm">
                  {receita.ingredientes.map((ingrediente) => {
                    const produto = produtos.find(
                      (item) =>
                        item.id === ingrediente.produtoId
                    );

                    return (
                      <li
                        key={ingrediente.produtoId}
                        className="flex justify-between gap-3 border-b border-slate-100 pb-2"
                      >
                        <span>
                          {produto?.nome ??
                            "Insumo não encontrado"}
                        </span>

                        <span className="font-medium">
                          {formatarNumero(
                            ingrediente.quantidade
                          )}{" "}
                          {produto?.unidade ?? ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {receita.modoPreparo && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold mb-2">
                      Modo de preparo
                    </h5>

                    <p className="text-sm text-slate-600 whitespace-pre-line">
                      {receita.modoPreparo}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
