
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  X,
  Save,
  Users,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

import { useEstudantes } from "../context/EstudantesContext";
import type {
  Estudante,
  RestricaoAlimentar,
} from "../types/Estudante";

type DadosFormulario = Omit<Estudante, "id">;

type LinhaExcel = Record<string, unknown>;

type ResultadoImportacao = {
  linha: number;
  estudante?: Estudante;
  erro?: string;
};

const diasSemana = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
];

const horarioValido = /^([01]\d|2[0-3]):[0-5]\d$/;

function formularioVazio(): DadosFormulario {
  return {
    nome: "",
    dias: [],
    entrada: "",
    saida: "",
    restricao: "nao_informado",
    tipoRestricao: "",
    alimentosEvitar: "",
    orientacoes: "",
    ativo: true,
  };
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function normalizarNome(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

function normalizarHorario(valor: unknown): string {
  if (typeof valor === "number") {
    if (valor >= 0 && valor < 1) {
      const minutos = Math.round(valor * 1440);
      const horas = Math.floor(minutos / 60) % 24;
      const mins = minutos % 60;

      return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
  }

  const valorTexto = texto(valor);

  if (/^\d{1,2}:\d{2}$/.test(valorTexto)) {
    const [hora, minuto] = valorTexto.split(":");
    return `${hora.padStart(2, "0")}:${minuto}`;
  }

  return valorTexto;
}

function interpretarDias(valor: unknown): string[] {
  const partes = texto(valor)
    .split(/[,;]/)
    .map((dia) => dia.trim().toLocaleLowerCase("pt-BR"));

  return diasSemana.filter((dia) =>
    partes.includes(dia.toLocaleLowerCase("pt-BR"))
  );
}

function interpretarRestricao(
  valor: unknown
): RestricaoAlimentar {
  const resposta = texto(valor).toLocaleLowerCase("pt-BR");

  if (["sim", "s"].includes(resposta)) return "sim";
  if (["não", "nao", "n"].includes(resposta)) return "nao";

  return "nao_informado";
}

export default function Estudantes() {
  const {
    estudantes,
    adicionarEstudante,
    atualizarEstudante,
    alterarSituacao,
    importarEstudantes,
  } = useEstudantes();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState<DadosFormulario>(
    formularioVazio
  );

  const [importacaoAberta, setImportacaoAberta] =
    useState(false);

  const [resultados, setResultados] = useState<
    ResultadoImportacao[]
  >([]);

  const [nomeArquivo, setNomeArquivo] = useState("");
  const [lendoArquivo, setLendoArquivo] = useState(false);

  const inputArquivo = useRef<HTMLInputElement>(null);

  const filtrados = estudantes.filter((estudante) =>
    normalizarNome(estudante.nome).includes(
      normalizarNome(busca)
    )
  );

  const ativos = estudantes.filter((e) => e.ativo).length;

  const comRestricao = estudantes.filter(
    (e) => e.ativo && e.restricao === "sim"
  ).length;

  const validos = resultados.filter(
    (resultado) => resultado.estudante
  );

  const invalidos = resultados.filter(
    (resultado) => resultado.erro
  );

  function fecharFormulario() {
    setFormAberto(false);
    setEditando(null);
    setForm(formularioVazio());
  }

  function novoCadastro() {
    setForm(formularioVazio());
    setEditando(null);
    setFormAberto(true);
  }

  function editar(estudante: Estudante) {
    const { id, ...dados } = estudante;

    setForm({
      ...dados,
      dias: [...dados.dias],
    });

    setEditando(id);
    setFormAberto(true);
  }

  function alternarDia(dia: string) {
    setForm((atual) => ({
      ...atual,
      dias: atual.dias.includes(dia)
        ? atual.dias.filter((d) => d !== dia)
        : [...atual.dias, dia],
    }));
  }

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!form.nome.trim()) {
      alert("Informe o nome do estudante.");
      return;
    }

    if (form.dias.length === 0) {
      alert("Selecione pelo menos um dia de atendimento.");
      return;
    }

    if (
      !horarioValido.test(form.entrada) ||
      !horarioValido.test(form.saida)
    ) {
      alert("Informe horários válidos no formato HH:MM.");
      return;
    }

    if (form.entrada >= form.saida) {
      alert("A saída deve ser posterior à entrada.");
      return;
    }

    if (form.restricao === "nao_informado") {
      alert("Confirme a situação da restrição alimentar.");
      return;
    }

    if (
      form.restricao === "sim" &&
      (!form.tipoRestricao.trim() ||
        !form.alimentosEvitar.trim())
    ) {
      alert(
        "Informe o tipo de restrição e os alimentos a evitar."
      );
      return;
    }

    const dados: DadosFormulario = {
      ...form,
      nome: form.nome.trim(),
      tipoRestricao:
        form.restricao === "sim"
          ? form.tipoRestricao.trim()
          : "",
      alimentosEvitar:
        form.restricao === "sim"
          ? form.alimentosEvitar.trim()
          : "",
      orientacoes:
        form.restricao === "sim"
          ? form.orientacoes.trim()
          : "",
    };

    if (editando !== null) {
      atualizarEstudante({
        ...dados,
        id: editando,
      });
    } else {
      adicionarEstudante({
        ...dados,
        id: Date.now(),
      });
    }

    fecharFormulario();
  }

  function baixarModelo() {
    const exemplo = [
      {
        Nome: "Estudante Exemplo",
        Dias: "Segunda, Quarta, Sexta",
        Entrada: "08:00",
        Saida: "11:30",
        Restricao: "Não",
        TipoRestricao: "",
        AlimentosEvitar: "",
        Orientacoes: "",
      },
      {
        Nome: "Estudante Exemplo 2",
        Dias: "Terça, Quinta",
        Entrada: "13:00",
        Saida: "16:00",
        Restricao: "Sim",
        TipoRestricao: "Alergia alimentar",
        AlimentosEvitar: "Leite e derivados",
        Orientacoes: "Utilizar alternativa sem leite",
      },
    ];

    const planilha = XLSX.utils.json_to_sheet(exemplo);

    planilha["!cols"] = [
      { wch: 28 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 25 },
      { wch: 30 },
      { wch: 40 },
    ];

    const arquivo = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      arquivo,
      planilha,
      "Estudantes"
    );

    XLSX.writeFile(arquivo, "modelo_estudantes_cape.xlsx");
  }

  function abrirImportacao() {
    setResultados([]);
    setNomeArquivo("");
    setImportacaoAberta(true);
  }

  function fecharImportacao() {
    setImportacaoAberta(false);
    setResultados([]);
    setNomeArquivo("");
  }

  async function lerPlanilha(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    setResultados([]);
    setNomeArquivo(arquivo.name);
    setLendoArquivo(true);

    try {
      if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error(
          "Selecione uma planilha Excel no formato .xlsx."
        );
      }

      const dadosArquivo = await arquivo.arrayBuffer();

      const pastaExcel = XLSX.read(dadosArquivo, {
        type: "array",
      });

      const primeiraAba = pastaExcel.Sheets[
        pastaExcel.SheetNames[0]
      ];

      if (!primeiraAba) {
        throw new Error("A planilha está vazia.");
      }

      const linhas = XLSX.utils.sheet_to_json<LinhaExcel>(
        primeiraAba,
        {
          defval: "",
          raw: true,
        }
      );

      if (linhas.length === 0) {
        throw new Error(
          "Nenhum estudante foi encontrado na planilha."
        );
      }

      const nomesExistentes = new Set(
        estudantes.map((e) => normalizarNome(e.nome))
      );

      const nomesNoArquivo = new Set<string>();

      const conferidos: ResultadoImportacao[] =
        linhas.map((linha, indice) => {
          const numeroLinha = indice + 2;

          const nome = texto(linha.Nome);
          const diasOriginais = texto(linha.Dias);
          const dias = interpretarDias(linha.Dias);
          const entrada = normalizarHorario(linha.Entrada);
          const saida = normalizarHorario(linha.Saida);

          const restricao = interpretarRestricao(
            linha.Restricao
          );

          const tipoRestricao = texto(
            linha.TipoRestricao
          );

          const alimentosEvitar = texto(
            linha.AlimentosEvitar
          );

          const orientacoes = texto(
            linha.Orientacoes
          );

          const erros: string[] = [];
          const nomeNormalizado = normalizarNome(nome);

          if (!nome) {
            erros.push("Nome não informado");
          } else if (
            nomesExistentes.has(nomeNormalizado) ||
            nomesNoArquivo.has(nomeNormalizado)
          ) {
            erros.push("Possível cadastro duplicado");
          }

          if (!diasOriginais || dias.length === 0) {
            erros.push("Dias de atendimento inválidos");
          } else {
            const quantidadeDias = diasOriginais
              .split(/[,;]/)
              .filter((d) => d.trim()).length;

            if (dias.length !== quantidadeDias) {
              erros.push("Existe um dia não reconhecido");
            }
          }

          if (
            !horarioValido.test(entrada) ||
            !horarioValido.test(saida)
          ) {
            erros.push("Horários inválidos");
          } else if (entrada >= saida) {
            erros.push(
              "Saída anterior ou igual à entrada"
            );
          }

          if (restricao === "nao_informado") {
            erros.push(
              "Restrição alimentar não informada"
            );
          }

          if (
            restricao === "sim" &&
            (!tipoRestricao || !alimentosEvitar)
          ) {
            erros.push(
              "Informações da restrição incompletas"
            );
          }

          if (nome) {
            nomesNoArquivo.add(nomeNormalizado);
          }

          if (erros.length > 0) {
            return {
              linha: numeroLinha,
              erro: erros.join("; "),
            };
          }

          return {
            linha: numeroLinha,
            estudante: {
              id: Date.now() + indice,
              nome,
              dias,
              entrada,
              saida,
              restricao,
              tipoRestricao:
                restricao === "sim" ? tipoRestricao : "",
              alimentosEvitar:
                restricao === "sim" ? alimentosEvitar : "",
              orientacoes:
                restricao === "sim" ? orientacoes : "",
              ativo: true,
            },
          };
        });

      setResultados(conferidos);
    } catch (erro) {
      alert(
        erro instanceof Error
          ? erro.message
          : "Não foi possível ler a planilha."
      );

      setResultados([]);
    } finally {
      setLendoArquivo(false);

      if (inputArquivo.current) {
        inputArquivo.current.value = "";
      }
    }
  }

  function confirmarImportacao() {
    const novos = validos
      .map((resultado) => resultado.estudante)
      .filter(
        (estudante): estudante is Estudante =>
          estudante !== undefined
      );

    if (novos.length === 0) {
      alert("Não há registros válidos para importar.");
      return;
    }

    const confirmacao = window.confirm(
      `Deseja importar ${novos.length} estudante(s)?`
    );

    if (!confirmacao) return;

    importarEstudantes(novos);
    fecharImportacao();

    alert(
      `${novos.length} estudante(s) enviado(s) para importação.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Estudantes
          </h2>

          <p className="text-slate-500 mt-1">
            Gerencie os cadastros e horários de atendimento.
          </p>

          <p className="text-xs text-amber-700 mt-1">
            Ambiente de testes. Não utilize dados reais.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={baixarModelo}
            className="border border-teal-700 text-teal-800 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-50"
          >
            <Download size={18} />
            Modelo Excel
          </button>

          <button
            type="button"
            onClick={abrirImportacao}
            className="border border-teal-700 text-teal-800 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-50"
          >
            <Upload size={18} />
            Importar Excel
          </button>

          <button
            type="button"
            onClick={novoCadastro}
            className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 rounded-xl flex items-center gap-2"
          >
            <UserPlus size={19} />
            Novo estudante
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            titulo: "Total de cadastros",
            valor: estudantes.length,
            icone: Users,
          },
          {
            titulo: "Estudantes ativos",
            valor: ativos,
            icone: UserCheck,
          },
          {
            titulo: "Com restrição alimentar",
            valor: comRestricao,
            icone: AlertTriangle,
          },
        ].map(({ titulo, valor, icone: Icone }) => (
          <div
            key={titulo}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <Icone
              className="text-teal-700 mb-3"
              size={23}
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

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="relative mb-5">
          <Search
            size={19}
            className="absolute left-3 top-3 text-slate-400"
          />

          <input
            aria-label="Pesquisar estudante"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar estudante pelo nome..."
            className="w-full border border-slate-300 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Nenhum estudante encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((estudante) => (
              <div
                key={estudante.id}
                className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold">
                    {estudante.nome}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {estudante.dias.join(", ")}
                    {" • "}
                    {estudante.entrada} às {estudante.saida}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        estudante.ativo
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {estudante.ativo
                        ? "Ativo"
                        : "Inativo"}
                    </span>

                    {estudante.restricao === "sim" && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                        Restrição cadastrada
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editar(estudante)}
                    className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200"
                    title="Editar estudante"
                    aria-label={`Editar ${estudante.nome}`}
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      alterarSituacao(estudante.id)
                    }
                    className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200"
                    title={
                      estudante.ativo
                        ? "Desativar"
                        : "Reativar"
                    }
                    aria-label={`Alterar situação de ${estudante.nome}`}
                  >
                    {estudante.ativo ? (
                      <UserX size={18} />
                    ) : (
                      <UserCheck size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-form-estudante"
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2
                id="titulo-form-estudante"
                className="text-xl font-bold"
              >
                {editando !== null
                  ? "Editar estudante"
                  : "Novo estudante"}
              </h2>

              <button
                type="button"
                onClick={fecharFormulario}
                aria-label="Fechar formulário"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={salvar}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="nome-estudante"
                  className="block text-sm font-medium mb-2"
                >
                  Nome completo *
                </label>

                <input
                  id="nome-estudante"
                  value={form.nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl p-3"
                  required
                />
              </div>

              <fieldset>
                <legend className="block text-sm font-medium mb-2">
                  Dias de atendimento *
                </legend>

                <div className="flex flex-wrap gap-2">
                  {diasSemana.map((dia) => (
                    <label
                      key={dia}
                      className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={form.dias.includes(dia)}
                        onChange={() => alternarDia(dia)}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="entrada-estudante"
                    className="block text-sm font-medium mb-2"
                  >
                    Entrada prevista *
                  </label>

                  <input
                    id="entrada-estudante"
                    type="text"
                    inputMode="numeric"
                    placeholder="13:00"
                    maxLength={5}
                    value={form.entrada}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        entrada: e.target.value,
                      })
                    }
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    title="Digite HH:MM no formato 24 horas"
                    className="w-full border border-slate-300 rounded-xl p-3"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="saida-estudante"
                    className="block text-sm font-medium mb-2"
                  >
                    Saída prevista *
                  </label>

                  <input
                    id="saida-estudante"
                    type="text"
                    inputMode="numeric"
                    placeholder="17:00"
                    maxLength={5}
                    value={form.saida}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        saida: e.target.value,
                      })
                    }
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    title="Digite HH:MM no formato 24 horas"
                    className="w-full border border-slate-300 rounded-xl p-3"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="restricao-estudante"
                  className="block text-sm font-medium mb-2"
                >
                  Possui restrição alimentar? *
                </label>

                <select
                  id="restricao-estudante"
                  value={form.restricao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      restricao: e.target
                        .value as RestricaoAlimentar,
                    })
                  }
                  className="w-full border border-slate-300 rounded-xl p-3"
                  required
                >
                  <option value="nao_informado">
                    Selecione
                  </option>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>

              {form.restricao === "sim" && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-4">
                  <p className="font-semibold text-amber-900">
                    Informações alimentares
                  </p>

                  <div>
                    <label
                      htmlFor="tipo-restricao"
                      className="block text-sm mb-2"
                    >
                      Tipo de restrição *
                    </label>

                    <select
                      id="tipo-restricao"
                      value={form.tipoRestricao}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tipoRestricao: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-xl p-3"
                      required
                    >
                      <option value="">
                        Selecione
                      </option>
                      <option value="Alergia alimentar">
                        Alergia alimentar
                      </option>
                      <option value="Intolerância alimentar">
                        Intolerância alimentar
                      </option>
                      <option value="Outra restrição">
                        Outra restrição
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="alimentos-evitar"
                      className="block text-sm mb-2"
                    >
                      Alimentos ou ingredientes a evitar *
                    </label>

                    <input
                      id="alimentos-evitar"
                      value={form.alimentosEvitar}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          alimentosEvitar: e.target.value,
                        })
                      }
                      placeholder="Ex.: leite e derivados"
                      className="w-full border border-slate-300 rounded-xl p-3"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="orientacoes-alimentares"
                      className="block text-sm mb-2"
                    >
                      Orientações específicas
                    </label>

                    <textarea
                      id="orientacoes-alimentares"
                      value={form.orientacoes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          orientacoes: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full border border-slate-300 rounded-xl p-3"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="px-5 py-3 rounded-xl border border-slate-300"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-teal-700 text-white flex items-center gap-2"
                >
                  <Save size={18} />
                  Salvar estudante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importacaoAberta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-importacao"
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex justify-between items-center mb-5">
              <h2
                id="titulo-importacao"
                className="text-xl font-bold"
              >
                Importar estudantes por Excel
              </h2>

              <button
                type="button"
                onClick={fecharImportacao}
                aria-label="Fechar importação"
              >
                <X size={22} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Utilize o modelo disponibilizado pelo sistema.
              Selecione uma planilha preenchida para conferir
              os dados antes de importar.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              <FileSpreadsheet
                size={38}
                className="mx-auto text-teal-700 mb-3"
              />

              <input
                ref={inputArquivo}
                type="file"
                accept=".xlsx"
                onChange={lerPlanilha}
                className="block w-full max-w-sm mx-auto text-sm"
                aria-label="Selecionar planilha Excel"
              />

              {nomeArquivo && (
                <p className="text-sm mt-3 text-slate-600">
                  Arquivo: {nomeArquivo}
                </p>
              )}

              {lendoArquivo && (
                <p className="text-sm mt-2">
                  Lendo planilha...
                </p>
              )}
            </div>

            {resultados.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-800">
                      Registros válidos
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {validos.length}
                    </p>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4">
                    <p className="text-sm text-amber-800">
                      Registros com problemas
                    </p>
                    <p className="text-2xl font-bold text-amber-900">
                      {invalidos.length}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3">Linha</th>
                        <th className="p-3">Estudante</th>
                        <th className="p-3">Situação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultados.map((resultado) => (
                        <tr
                          key={resultado.linha}
                          className="border-b border-slate-200"
                        >
                          <td className="p-3">
                            {resultado.linha}
                          </td>

                          <td className="p-3">
                            {resultado.estudante?.nome ??
                              "Registro inválido"}
                          </td>

                          <td className="p-3">
                            {resultado.erro ? (
                              <span className="text-amber-700">
                                {resultado.erro}
                              </span>
                            ) : (
                              <span className="text-green-700">
                                Pronto para importar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {invalidos.length > 0 && (
                  <p className="text-sm text-amber-700">
                    Os registros com problemas não serão
                    importados. Corrija a planilha e selecione
                    o arquivo novamente para incluí-los.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={fecharImportacao}
                className="px-5 py-3 rounded-xl border border-slate-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarImportacao}
                disabled={
                  validos.length === 0 || lendoArquivo
                }
                className="px-5 py-3 rounded-xl bg-teal-700 text-white disabled:opacity-50"
              >
                Confirmar importação
                {validos.length > 0
                  ? ` (${validos.length})`
                  : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
