
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { TipoRefeicao } from "./RefeicoesContext";

// ======================================================
// TIPOS
// ======================================================

export type ProdutoEstoque = {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  validade: string;
};

export type LoteEstoque = {
  id: number;
  produtoId: number;
  numero: string;
  quantidade: number;
  validade: string;
  dataEntrada: string;
};

export type TipoMovimentacao = "entrada" | "saida";

export type MovimentacaoEstoque = {
  id: number;
  produtoId: number;
  produtoNome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  unidade: string;
  data: string;
  observacao: string;
  lotes: {
    loteId: number;
    numero: string;
    quantidade: number;
  }[];
};

export type IngredienteConsumido = {
  produtoId: number;
  quantidade: number;
};

export type RegistroProducao = {
  id: number;
  data: string;
  refeicaoId: TipoRefeicao;
  porcoesProduzidas: number;
  ingredientes: IngredienteConsumido[];
  movimentacoesIds: number[];
  registradoEm: string;
};

export type ResultadoProducao = {
  sucesso: boolean;
  mensagem: string;
};

type NovoProduto = Omit<ProdutoEstoque, "id">;

type DadosEstoque = {
  produtos: ProdutoEstoque[];
  lotes: LoteEstoque[];
  movimentacoes: MovimentacaoEstoque[];
  producoes: RegistroProducao[];
};

type EstoqueContextType = DadosEstoque & {
  adicionarProduto: (produto: NovoProduto) => void;

  excluirProduto: (id: number) => void;

  registrarMovimentacao: (
    produtoId: number,
    tipo: TipoMovimentacao,
    quantidade: number,
    observacao: string,
    numeroLote?: string,
    validade?: string
  ) => boolean;

  registrarProducao: (
    data: string,
    refeicaoId: TipoRefeicao,
    porcoesProduzidas: number,
    ingredientes: IngredienteConsumido[]
  ) => ResultadoProducao;
};

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const CHAVE_ESTOQUE = "cape_gestao_estoque_v1";

const TOLERANCIA = 1e-9;

const gerarId = () => Date.now() + Math.random();

const EstoqueContext = createContext<
  EstoqueContextType | undefined
>(undefined);

// ======================================================
// PERSISTÊNCIA LOCAL
// ======================================================

function dadosVazios(): DadosEstoque {
  return {
    produtos: [],
    lotes: [],
    movimentacoes: [],
    producoes: [],
  };
}

function carregarEstoque(): DadosEstoque {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_ESTOQUE
    );

    if (!dadosSalvos) {
      return dadosVazios();
    }

    const dados: unknown = JSON.parse(dadosSalvos);

    if (
      !dados ||
      typeof dados !== "object" ||
      Array.isArray(dados)
    ) {
      console.warn(
        "Os dados salvos do estoque estão em formato inválido."
      );

      return dadosVazios();
    }

    const objeto = dados as Record<string, unknown>;

    const campos = [
      "produtos",
      "lotes",
      "movimentacoes",
      "producoes",
    ];

    const formatoValido = campos.every(
      (campo) => Array.isArray(objeto[campo])
    );

    if (!formatoValido) {
      console.warn(
        "O armazenamento do estoque está incompleto."
      );

      return dadosVazios();
    }

    return dados as DadosEstoque;
  } catch (erro) {
    console.error(
      "Erro ao recuperar os dados do estoque:",
      erro
    );

    return dadosVazios();
  }
}

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function dataLocal(): string {
  const hoje = new Date();

  return (
    `${hoje.getFullYear()}-` +
    `${String(hoje.getMonth() + 1).padStart(2, "0")}-` +
    `${String(hoje.getDate()).padStart(2, "0")}`
  );
}

function dataValida(valor: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    valor
  );

  if (!partes) return false;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);

  const data = new Date(
    Date.UTC(ano, mes - 1, dia)
  );

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function quantidadeTotal(
  lista: LoteEstoque[]
): number {
  return lista.reduce(
    (total, lote) => total + lote.quantidade,
    0
  );
}

function validadeMaisProxima(
  lista: LoteEstoque[]
): string {
  return (
    lista
      .filter(
        (lote) =>
          lote.quantidade > 0 &&
          lote.validade !== ""
      )
      .map((lote) => lote.validade)
      .sort()[0] ?? ""
  );
}

function atualizarSaldos(
  produtos: ProdutoEstoque[],
  lotes: LoteEstoque[]
): ProdutoEstoque[] {
  return produtos.map((produto) => {
    const lotesProduto = lotes.filter(
      (lote) => lote.produtoId === produto.id
    );

    return {
      ...produto,
      quantidade: quantidadeTotal(lotesProduto),
      validade: validadeMaisProxima(lotesProduto),
    };
  });
}

// Retorna somente os lotes que podem ser
// utilizados na data atual, ordenados por PVPS.
function lotesDisponiveis(
  lista: LoteEstoque[],
  produtoId: number,
  hoje: string
): LoteEstoque[] {
  return lista
    .filter(
      (lote) =>
        lote.produtoId === produtoId &&
        lote.quantidade > 0 &&
        dataValida(lote.validade) &&
        lote.validade >= hoje
    )
    .sort(
      (a, b) =>
        a.validade.localeCompare(b.validade) ||
        a.dataEntrada.localeCompare(b.dataEntrada)
    );
}

// Simula a retirada sem modificar os lotes
// originais. Isso evita baixas parciais.
function retirarDosLotes(
  lista: LoteEstoque[],
  produtoId: number,
  quantidade: number,
  hoje: string
): {
  sucesso: boolean;
  lotesAtualizados: LoteEstoque[];
  utilizados: MovimentacaoEstoque["lotes"];
} {
  const disponiveis = lotesDisponiveis(
    lista,
    produtoId,
    hoje
  );

  const totalDisponivel = quantidadeTotal(
    disponiveis
  );

  if (
    !Number.isFinite(quantidade) ||
    quantidade <= 0 ||
    quantidade > totalDisponivel + TOLERANCIA
  ) {
    return {
      sucesso: false,
      lotesAtualizados: lista,
      utilizados: [],
    };
  }

  const atualizados = lista.map((lote) => ({
    ...lote,
  }));

  const utilizados: MovimentacaoEstoque["lotes"] =
    [];

  let restante = quantidade;

  for (const lote of disponiveis) {
    if (restante <= TOLERANCIA) {
      break;
    }

    const retirar = Math.min(
      lote.quantidade,
      restante
    );

    const alvo = atualizados.find(
      (item) => item.id === lote.id
    );

    if (!alvo) continue;

    alvo.quantidade = Math.max(
      0,
      alvo.quantidade - retirar
    );

    restante = Math.max(
      0,
      restante - retirar
    );

    utilizados.push({
      loteId: lote.id,
      numero: lote.numero,
      quantidade: retirar,
    });
  }

  if (restante > TOLERANCIA) {
    return {
      sucesso: false,
      lotesAtualizados: lista,
      utilizados: [],
    };
  }

  return {
    sucesso: true,
    lotesAtualizados: atualizados,
    utilizados,
  };
}

// ======================================================
// PROVIDER
// ======================================================

export function EstoqueProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Carrega os quatro conjuntos de dados juntos.
  const [dados, setDados] = useState<DadosEstoque>(
    carregarEstoque
  );

  // Referência sincronizada para evitar que
  // operações consecutivas utilizem dados antigos.
  const dadosRef = useRef<DadosEstoque>(dados);

  const {
    produtos,
    lotes,
    movimentacoes,
    producoes,
  } = dados;

  // Salva automaticamente o estado completo.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_ESTOQUE,
        JSON.stringify(dados)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar os dados do estoque:",
        erro
      );
    }
  }, [dados]);

  // Atualiza o estado e a referência ao mesmo tempo.
  function atualizarDados(
    novosDados: DadosEstoque
  ) {
    dadosRef.current = novosDados;
    setDados(novosDados);
  }

  // ====================================================
  // CADASTRO DE PRODUTOS
  // ====================================================

  function adicionarProduto(
    produto: NovoProduto
  ) {
    const atual = dadosRef.current;

    const id = gerarId();

    const quantidade =
      Number.isFinite(produto.quantidade) &&
      produto.quantidade > 0
        ? produto.quantidade
        : 0;

    const novoProduto: ProdutoEstoque = {
      ...produto,
      id,
      quantidade,
    };

    const novosProdutos = [
      ...atual.produtos,
      novoProduto,
    ];

    let novosLotes = atual.lotes;

    if (quantidade > 0) {
      const novoLote: LoteEstoque = {
        id: gerarId(),
        produtoId: id,
        numero: "LOTE-INICIAL",
        quantidade,
        validade: produto.validade,
        dataEntrada: dataLocal(),
      };

      novosLotes = [
        ...atual.lotes,
        novoLote,
      ];
    }

    atualizarDados({
      ...atual,
      produtos: novosProdutos,
      lotes: novosLotes,
    });
  }

  function excluirProduto(id: number) {
    const atual = dadosRef.current;

    const novosProdutos = atual.produtos.filter(
      (produto) => produto.id !== id
    );

    const novosLotes = atual.lotes.filter(
      (lote) => lote.produtoId !== id
    );

    // O histórico permanece preservado.
    atualizarDados({
      ...atual,
      produtos: novosProdutos,
      lotes: novosLotes,
    });
  }

  // ====================================================
  // MOVIMENTAÇÕES DE ESTOQUE
  // ====================================================

  function registrarMovimentacao(
    produtoId: number,
    tipo: TipoMovimentacao,
    quantidade: number,
    observacao: string,
    numeroLote = "",
    validade = ""
  ): boolean {
    const atual = dadosRef.current;

    const produto = atual.produtos.find(
      (item) => item.id === produtoId
    );

    if (
      !produto ||
      !Number.isFinite(quantidade) ||
      quantidade <= 0
    ) {
      return false;
    }

    const agora = new Date().toISOString();
    const hoje = dataLocal();

    // --------------------------------------------------
    // ENTRADA
    // --------------------------------------------------

    if (tipo === "entrada") {
      const numero = numeroLote.trim();

      if (
        !numero ||
        !dataValida(validade)
      ) {
        return false;
      }

      const existente = atual.lotes.find(
        (lote) =>
          lote.produtoId === produtoId &&
          lote.numero === numero
      );

      if (
        existente &&
        existente.validade !== validade
      ) {
        return false;
      }

      const loteId = existente?.id ?? gerarId();

      const novosLotes: LoteEstoque[] = existente
        ? atual.lotes.map((lote) =>
            lote.id === loteId
              ? {
                  ...lote,
                  quantidade:
                    lote.quantidade + quantidade,
                }
              : lote
          )
        : [
            ...atual.lotes,
            {
              id: loteId,
              produtoId,
              numero,
              quantidade,
              validade,
              dataEntrada: hoje,
            },
          ];

      const novosProdutos = atualizarSaldos(
        atual.produtos,
        novosLotes
      );

      const novaMovimentacao: MovimentacaoEstoque = {
        id: gerarId(),
        produtoId,
        produtoNome: produto.nome,
        tipo: "entrada",
        quantidade,
        unidade: produto.unidade,
        data: agora,
        observacao: observacao.trim(),
        lotes: [
          {
            loteId,
            numero,
            quantidade,
          },
        ],
      };

      atualizarDados({
        ...atual,
        produtos: novosProdutos,
        lotes: novosLotes,
        movimentacoes: [
          novaMovimentacao,
          ...atual.movimentacoes,
        ],
      });

      return true;
    }

    // --------------------------------------------------
    // SAÍDA MANUAL
    // --------------------------------------------------

    if (tipo !== "saida") {
      return false;
    }

    const retirada = retirarDosLotes(
      atual.lotes,
      produtoId,
      quantidade,
      hoje
    );

    if (!retirada.sucesso) {
      return false;
    }

    const novosProdutos = atualizarSaldos(
      atual.produtos,
      retirada.lotesAtualizados
    );

    const novaMovimentacao: MovimentacaoEstoque = {
      id: gerarId(),
      produtoId,
      produtoNome: produto.nome,
      tipo: "saida",
      quantidade,
      unidade: produto.unidade,
      data: agora,
      observacao: observacao.trim(),
      lotes: retirada.utilizados,
    };

    atualizarDados({
      ...atual,
      produtos: novosProdutos,
      lotes: retirada.lotesAtualizados,
      movimentacoes: [
        novaMovimentacao,
        ...atual.movimentacoes,
      ],
    });

    return true;
  }

  // ====================================================
  // PRODUÇÃO DE REFEIÇÕES
  // ====================================================

  function registrarProducao(
    data: string,
    refeicaoId: TipoRefeicao,
    porcoesProduzidas: number,
    ingredientes: IngredienteConsumido[]
  ): ResultadoProducao {
    const atual = dadosRef.current;

    const hoje = dataLocal();

    // A baixa de produção é permitida somente
    // na data atual.
    if (!dataValida(data) || data !== hoje) {
      return {
        sucesso: false,
        mensagem:
          "A produção só pode ser confirmada na data atual.",
      };
    }

    if (
      !Number.isInteger(porcoesProduzidas) ||
      porcoesProduzidas <= 0
    ) {
      return {
        sucesso: false,
        mensagem:
          "Informe uma quantidade válida de porções produzidas.",
      };
    }

    if (
      !Array.isArray(ingredientes) ||
      ingredientes.length === 0
    ) {
      return {
        sucesso: false,
        mensagem:
          "Informe os ingredientes utilizados na produção.",
      };
    }

    // Impede uma segunda produção da mesma
    // refeição no mesmo dia.
    const jaRegistrada = atual.producoes.some(
      (producao) =>
        producao.data === data &&
        producao.refeicaoId === refeicaoId
    );

    if (jaRegistrada) {
      return {
        sucesso: false,
        mensagem:
          "A produção desta refeição já foi confirmada hoje.",
      };
    }

    // --------------------------------------------------
    // CONSOLIDA INGREDIENTES REPETIDOS
    // --------------------------------------------------

    const quantidades = new Map<number, number>();

    for (const ingrediente of ingredientes) {
      if (
        !Number.isFinite(ingrediente.produtoId) ||
        !Number.isFinite(ingrediente.quantidade) ||
        ingrediente.quantidade <= 0
      ) {
        return {
          sucesso: false,
          mensagem:
            "Existe um ingrediente com quantidade inválida.",
        };
      }

      const anterior =
        quantidades.get(ingrediente.produtoId) ?? 0;

      quantidades.set(
        ingrediente.produtoId,
        anterior + ingrediente.quantidade
      );
    }

    const consolidados: IngredienteConsumido[] =
      Array.from(quantidades.entries()).map(
        ([produtoId, quantidade]) => ({
          produtoId,
          quantidade,
        })
      );

    // --------------------------------------------------
    // SIMULA A RETIRADA DE TODOS OS INGREDIENTES
    // --------------------------------------------------

    // Nenhuma alteração real acontece
    // até que todos os ingredientes sejam validados.
    let lotesSimulados = atual.lotes.map(
      (lote) => ({ ...lote })
    );

    const novasMovimentacoes: MovimentacaoEstoque[] =
      [];

    const agora = new Date().toISOString();

    for (const ingrediente of consolidados) {
      const produto = atual.produtos.find(
        (item) => item.id === ingrediente.produtoId
      );

      if (!produto) {
        return {
          sucesso: false,
          mensagem:
            `Produto não encontrado: ${ingrediente.produtoId}.`,
        };
      }

      const retirada = retirarDosLotes(
        lotesSimulados,
        ingrediente.produtoId,
        ingrediente.quantidade,
        hoje
      );

      if (!retirada.sucesso) {
        return {
          sucesso: false,
          mensagem:
            `Estoque válido insuficiente para ${produto.nome}. ` +
            "Nenhum ingrediente foi baixado.",
        };
      }

      lotesSimulados = retirada.lotesAtualizados;

      novasMovimentacoes.push({
        id: gerarId(),
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipo: "saida",
        quantidade: ingrediente.quantidade,
        unidade: produto.unidade,
        data: agora,
        observacao:
          `Consumo na produção da refeição ${refeicaoId} ` +
          `em ${data}. ${porcoesProduzidas} porções.`,
        lotes: retirada.utilizados,
      });
    }

    // --------------------------------------------------
    // CONFIRMAÇÃO DA PRODUÇÃO
    // --------------------------------------------------

    // Todas as validações foram concluídas.
    // Agora os saldos podem ser atualizados.
    const novosProdutos = atualizarSaldos(
      atual.produtos,
      lotesSimulados
    );

    const novaProducao: RegistroProducao = {
      id: gerarId(),
      data,
      refeicaoId,
      porcoesProduzidas,
      ingredientes: consolidados,
      movimentacoesIds: novasMovimentacoes.map(
        (item) => item.id
      ),
      registradoEm: agora,
    };

    // Atualiza todos os conjuntos de dados
    // em uma única operação.
    atualizarDados({
      produtos: novosProdutos,
      lotes: lotesSimulados,
      movimentacoes: [
        ...novasMovimentacoes,
        ...atual.movimentacoes,
      ],
      producoes: [
        novaProducao,
        ...atual.producoes,
      ],
    });

    return {
      sucesso: true,
      mensagem:
        "Produção confirmada e ingredientes baixados do estoque.",
    };
  }

  // ====================================================
  // DISPONIBILIZAÇÃO DO CONTEXTO
  // ====================================================

  return (
    <EstoqueContext.Provider
      value={{
        produtos,
        lotes,
        movimentacoes,
        producoes,
        adicionarProduto,
        excluirProduto,
        registrarMovimentacao,
        registrarProducao,
      }}
    >
      {children}
    </EstoqueContext.Provider>
  );
}

// ======================================================
// HOOK
// ======================================================

export function useEstoque() {
  const contexto = useContext(EstoqueContext);

  if (!contexto) {
    throw new Error(
      "useEstoque deve ser utilizado dentro de EstoqueProvider."
    );
  }

  return contexto;
}
