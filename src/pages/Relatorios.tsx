
import { useState } from "react";
import {
  Package,
  ChefHat,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ChartColumn,
} from "lucide-react";

import { useEstoque } from "../context/EstoqueContext";
import { useRefeicoes } from "../context/RefeicoesContext";
import { exportarPDF } from "../utils/exportarPDF";

function hojeLocal() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(valor: string) {
  const data = valor.slice(0, 10);
  const partes = data.split("-");
  if (partes.length !== 3) return valor;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

export default function Relatorios() {
  const { produtos, lotes, movimentacoes, producoes } = useEstoque();
  const { refeicoes } = useRefeicoes();

  const [dataInicial, setDataInicial] = useState(hojeLocal);
  const [dataFinal, setDataFinal] = useState(hojeLocal);

  const periodoValido =
    Boolean(dataInicial && dataFinal) &&
    dataInicial <= dataFinal;

  const producoesFiltradas = producoes.filter(
    (producao) =>
      periodoValido &&
      producao.data >= dataInicial &&
      producao.data <= dataFinal
  );

  const movimentacoesFiltradas = movimentacoes.filter(
    (movimentacao) => {
      const data = movimentacao.data.slice(0, 10);
      return (
        periodoValido &&
        data >= dataInicial &&
        data <= dataFinal
      );
    }
  );

  const entradas = movimentacoesFiltradas.filter(
    (item) => item.tipo === "entrada"
  );

  const saidas = movimentacoesFiltradas.filter(
    (item) => item.tipo === "saida"
  );

  const estoqueBaixo = produtos.filter(
    (produto) => produto.quantidade <= produto.estoqueMinimo
  );

  const lotesVencidos = lotes.filter(
    (lote) =>
      lote.quantidade > 0 &&
      lote.validade !== "" &&
      lote.validade < hojeLocal()
  );

  const totalPorcoes = producoesFiltradas.reduce(
    (total, producao) => total + producao.porcoesProduzidas,
    0
  );

  function nomeRefeicao(id: string) {
    return refeicoes.find((item) => item.id === id)?.nome ?? id;
  }

  const indicadores = [
    {
      titulo: "Produções confirmadas",
      valor: producoesFiltradas.length,
      icone: ChefHat,
    },
    {
      titulo: "Porções produzidas",
      valor: totalPorcoes,
      icone: ChartColumn,
    },
    {
      titulo: "Entradas no período",
      valor: entradas.length,
      icone: ArrowDownCircle,
    },
    {
      titulo: "Saídas no período",
      valor: saidas.length,
      icone: ArrowUpCircle,
    },
    {
      titulo: "Produtos cadastrados",
      valor: produtos.length,
      icone: Package,
    },
    {
      titulo: "Estoque baixo",
      valor: estoqueBaixo.length,
      icone: AlertTriangle,
    },
  ];
  
  const periodoTexto =
    `${formatarData(dataInicial)} a ${formatarData(dataFinal)}`;

  function baixarResumoPDF() {
    exportarPDF({
      titulo: "Resumo Gerencial",
      nomeArquivo: "CAPE_Resumo_Gerencial.pdf",
      colunas: ["Indicador", "Quantidade"],
      linhas: indicadores.map((item) => [
        item.titulo,
        item.valor,
      ]),
      periodo: periodoTexto,
      observacao:
        "Produções, porções, entradas e saídas consideram o período selecionado. " +
        "Produtos cadastrados e estoque baixo representam a situação atual. " +
        "As entradas e saídas indicam quantidade de movimentações, não volume total de produtos.",
    });
  }

  function baixarProducoesPDF() {
    exportarPDF({
      titulo: "Produção de Refeições",
      nomeArquivo: "CAPE_Producao_Refeicoes.pdf",
      colunas: [
        "Data",
        "Refeição",
        "Porções produzidas",
        "Ingredientes consumidos",
      ],
      linhas: [...producoesFiltradas]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((producao) => [
          formatarData(producao.data),
          nomeRefeicao(producao.refeicaoId),
          producao.porcoesProduzidas,
          producao.ingredientes
            .map((ingrediente) => {
              const produto = produtos.find(
                (p) => p.id === ingrediente.produtoId
              );

              return (
                `${produto?.nome ?? "Produto excluído"}: ` +
                `${formatarNumero(ingrediente.quantidade)} ` +
                `${produto?.unidade ?? ""}`
              );
            })
            .join("; "),
        ]),
      periodo: periodoTexto,
      observacao:
        `Total de produções: ${producoesFiltradas.length}. ` +
        `Total de porções produzidas: ${formatarNumero(totalPorcoes)}. ` +
        "As porções produzidas não representam necessariamente refeições servidas.",
    });
  }

  function baixarMovimentacoesPDF() {
    exportarPDF({
      titulo: "Movimentações do Estoque",
      nomeArquivo: "CAPE_Movimentacoes_Estoque.pdf",
      colunas: [
        "Data",
        "Produto",
        "Tipo",
        "Quantidade",
        "Observação",
      ],
      linhas: [...movimentacoesFiltradas]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((item) => [
          new Date(item.data).toLocaleString("pt-BR"),
          item.produtoNome,
          item.tipo === "entrada" ? "Entrada" : "Saída",
          `${formatarNumero(item.quantidade)} ${item.unidade}`,
          item.observacao || "—",
        ]),
      periodo: periodoTexto,
      observacao:
        `Total de entradas registradas: ${entradas.length}. ` +
        `Total de saídas registradas: ${saidas.length}.`,
    });
  }

  function baixarEstoqueBaixoPDF() {
    exportarPDF({
      titulo: "Produtos com Estoque Baixo",
      nomeArquivo: "CAPE_Estoque_Baixo.pdf",
      colunas: [
        "Produto",
        "Categoria",
        "Quantidade atual",
        "Estoque mínimo",
      ],
      linhas: estoqueBaixo.map((produto) => [
        produto.nome,
        produto.categoria,
        `${formatarNumero(produto.quantidade)} ${produto.unidade}`,
        `${formatarNumero(produto.estoqueMinimo)} ${produto.unidade}`,
      ]),
      observacao:
        `Total de produtos no limite ou abaixo do mínimo: ${estoqueBaixo.length}. ` +
        `Lotes vencidos com saldo: ${lotesVencidos.length}. ` +
        "Este relatório apresenta a situação atual do estoque.",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">
          Relatórios Gerenciais
        </h3>
        <p className="text-slate-500 mt-1">
          Acompanhe a produção de refeições, as movimentações
          de estoque e os indicadores da instituição.
        </p>
      </div>

      {/* FILTRO DE PERÍODO */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="font-semibold mb-4">
          Período de consulta
        </h4>

        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-slate-600">
            Data inicial
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="block mt-1 border border-slate-300 rounded-lg p-2"
            />
          </label>

          <label className="text-sm text-slate-600">
            Data final
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="block mt-1 border border-slate-300 rounded-lg p-2"
            />
          </label>
        </div>

        {!periodoValido && (
          <p className="text-red-600 text-sm mt-3">
            Informe um período válido.
          </p>
        )}

        <p className="text-xs text-slate-500 mt-3">
          O período filtra produções e movimentações.
          Os indicadores de estoque mostram a situação atual.
        </p>
      </section>
<div className="flex justify-end">
  <button
    type="button"
    onClick={baixarResumoPDF}
    disabled={!periodoValido}
    className="bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
  >
    Exportar resumo em PDF
  </button>
</div>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {indicadores.map(({ titulo, valor, icone: Icone }) => (
          <div
            key={titulo}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex justify-between items-center gap-3">
              <span className="text-sm text-slate-500">
                {titulo}
              </span>
              <Icone className="text-teal-700" size={22} />
            </div>

            <p className="text-3xl font-bold mt-4">
              {formatarNumero(valor)}
            </p>
          </div>
        ))}
      </div>

      {/* PRODUÇÕES */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-lg font-semibold mb-4">
          Histórico de produção de refeições
        </h4>
        <button
  type="button"
  onClick={baixarProducoesPDF}
  disabled={!periodoValido}
  className="mb-4 bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
>
  Exportar produção em PDF
</button>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Refeição</th>
                <th className="p-3">Porções</th>
                <th className="p-3">Ingredientes consumidos</th>
              </tr>
            </thead>

            <tbody>
              {producoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    Nenhuma produção registrada no período.
                  </td>
                </tr>
              ) : (
                [...producoesFiltradas]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((producao) => (
                    <tr
                      key={producao.id}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">
                        {formatarData(producao.data)}
                      </td>

                      <td className="p-3">
                        {nomeRefeicao(producao.refeicaoId)}
                      </td>

                      <td className="p-3">
                        {formatarNumero(producao.porcoesProduzidas)}
                      </td>

                      <td className="p-3">
                        {producao.ingredientes.map((ingrediente) => {
                          const produto = produtos.find(
                            (p) => p.id === ingrediente.produtoId
                          );

                          return (
                            <div key={ingrediente.produtoId}>
                              {produto?.nome ?? "Produto excluído"}:{" "}
                              {formatarNumero(ingrediente.quantidade)}{" "}
                              {produto?.unidade ?? ""}
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOVIMENTAÇÕES */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-lg font-semibold mb-4">
          Histórico de movimentações do estoque
        </h4>
<button
  type="button"
  onClick={baixarMovimentacoesPDF}
  disabled={!periodoValido}
  className="mb-4 bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
>
  Exportar movimentações em PDF
</button>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Quantidade</th>
                <th className="p-3">Observação</th>
              </tr>
            </thead>

            <tbody>
              {movimentacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-slate-500">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                [...movimentacoesFiltradas]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((movimentacao) => (
                    <tr
                      key={movimentacao.id}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">
                        {formatarData(movimentacao.data)}
                      </td>

                      <td className="p-3">
                        {movimentacao.produtoNome}
                      </td>

                      <td className="p-3">
                        {movimentacao.tipo === "entrada"
                          ? "Entrada"
                          : "Saída"}
                      </td>

                      <td className="p-3">
                        {formatarNumero(movimentacao.quantidade)}{" "}
                        {movimentacao.unidade}
                      </td>

                      <td className="p-3">
                        {movimentacao.observacao || "—"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ESTOQUE BAIXO */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-lg font-semibold mb-4">
          Produtos com estoque baixo
        </h4>
<button
  type="button"
  onClick={baixarEstoqueBaixoPDF}
  className="mb-4 bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800"
>
  Exportar estoque baixo em PDF
</button>

        {estoqueBaixo.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nenhum produto está no limite ou abaixo do estoque mínimo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Quantidade atual</th>
                  <th className="p-3">Estoque mínimo</th>
                </tr>
              </thead>

              <tbody>
                {estoqueBaixo.map((produto) => (
                  <tr
                    key={produto.id}
                    className="border-t border-slate-100"
                  >
                    <td className="p-3">{produto.nome}</td>
                    <td className="p-3">
                      {formatarNumero(produto.quantidade)}{" "}
                      {produto.unidade}
                    </td>
                    <td className="p-3">
                      {formatarNumero(produto.estoqueMinimo)}{" "}
                      {produto.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lotesVencidos.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-amber-800">
              Atenção: existem {lotesVencidos.length} lote(s)
              vencido(s) com saldo em estoque.
            </p>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        As porções produzidas são contabilizadas na confirmação
        da produção. O total de refeições efetivamente servidas
        ainda não está integrado a este relatório.
      </p>
    </div>
  );
}
