import { useState, type FormEvent } from "react";
import {
  Package, Plus, Search, AlertTriangle, CalendarClock, Trash2, X,
  CheckCircle2, ArrowDownToLine, ArrowUpFromLine, History, Layers3,
} from "lucide-react";
import { useEstoque, type ProdutoEstoque, type TipoMovimentacao } from "../context/EstoqueContext";
import DataBrasileira from "../components/DataBrasileira";

const categorias = ["Cereais e grãos", "Carnes e ovos", "Leite e derivados", "Frutas", "Verduras e legumes", "Massas e panificados", "Temperos e condimentos", "Bebidas", "Outros"];
const unidades = ["kg", "g", "L", "mL", "unidade", "pacote", "caixa"];
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatarData(data: string) {
  if (!data) return "Não informada";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}
function diasAte(data: string): number | null {
  if (!data) return null;
  return Math.round((new Date(`${data}T12:00:00`).getTime() - new Date(`${hojeISO()}T12:00:00`).getTime()) / 86400000);
}
function novoFormulario() {
  return { nome: "", categoria: categorias[0], unidade: unidades[0], quantidade: "", estoqueMinimo: "", validade: "" };
}
type FormularioMovimentacao = {
  produtoId: number; tipo: TipoMovimentacao; quantidade: string;
  observacao: string; numeroLote: string; validade: string;
};
export default function Estoque() {
  const { produtos, lotes, movimentacoes, adicionarProduto, excluirProduto, registrarMovimentacao } = useEstoque();
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(novoFormulario());
  const [movimentacaoAtual, setMovimentacaoAtual] = useState<FormularioMovimentacao | null>(null);
  const [lotesAbertos, setLotesAbertos] = useState<number[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const limparAvisos = () => { setMensagem(""); setErro(""); };
  const estoqueBaixo = produtos.filter(p => p.quantidade <= p.estoqueMinimo).length;
  const lotesComSaldo = lotes.filter(l => l.quantidade > 0);
  const vencidos = lotesComSaldo.filter(l => { const dias = diasAte(l.validade); return dias !== null && dias < 0; }).length;
  const proximos = lotesComSaldo.filter(l => { const dias = diasAte(l.validade); return dias !== null && dias >= 0 && dias <= 7; }).length;
  const semValidade = lotesComSaldo.filter(l => !l.validade).length;
  const produtosFiltrados = produtos.filter(p => `${p.nome} ${p.categoria}`.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")))
    .sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR"));

  function atualizarCampo(campo: keyof ReturnType<typeof novoFormulario>, valor: string) {
    setFormulario(anterior => ({ ...anterior, [campo]: valor }));
  }
  function cadastrarProduto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); limparAvisos();
    const quantidade = Number(formulario.quantidade);
    const minimo = Number(formulario.estoqueMinimo);
    if (!formulario.nome.trim() || formulario.quantidade.trim() === "" || formulario.estoqueMinimo.trim() === "" ||
      !Number.isFinite(quantidade) || !Number.isFinite(minimo) || quantidade < 0 || minimo < 0 ||
      (quantidade > 0 && !formulario.validade)) {
      setErro("Informe nome, quantidades válidas e a validade quando houver estoque inicial."); return;
    }
    if (produtos.some(p => p.nome.trim().toLocaleLowerCase("pt-BR") === formulario.nome.trim().toLocaleLowerCase("pt-BR") && p.unidade === formulario.unidade)) {
      setErro("Este insumo já está cadastrado nessa unidade. Use Entrada para adicionar um novo lote."); return;
    }
    adicionarProduto({ nome: formulario.nome.trim(), categoria: formulario.categoria, unidade: formulario.unidade,
      quantidade, estoqueMinimo: minimo, validade: formulario.validade });
    setFormulario(novoFormulario()); setMostrarFormulario(false); setMensagem("Insumo cadastrado com sucesso!");
  }
  function removerProduto(produto: ProdutoEstoque) {
    if (!window.confirm(`Deseja realmente excluir o insumo "${produto.nome}"? O histórico será preservado.`)) return;
    excluirProduto(produto.id); limparAvisos(); setMensagem("Insumo excluído.");
  }
  function abrirMovimentacao(produtoId: number, tipo: TipoMovimentacao) {
    limparAvisos();
    setMovimentacaoAtual({ produtoId, tipo, quantidade: "", observacao: "", numeroLote: "", validade: "" });
  }
  function salvarMovimentacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); limparAvisos();
    if (!movimentacaoAtual) return;
    const quantidade = Number(movimentacaoAtual.quantidade);
    if (movimentacaoAtual.quantidade.trim() === "" || !Number.isFinite(quantidade) || quantidade <= 0) {
      setErro("Informe uma quantidade maior que zero."); return;
    }
    if (movimentacaoAtual.tipo === "entrada" && (!movimentacaoAtual.numeroLote.trim() || !movimentacaoAtual.validade)) {
      setErro("Informe o número do lote e sua data de validade."); return;
    }
    const sucesso = registrarMovimentacao(movimentacaoAtual.produtoId, movimentacaoAtual.tipo,
      quantidade, movimentacaoAtual.observacao, movimentacaoAtual.numeroLote, movimentacaoAtual.validade);
    if (!sucesso) {
      setErro(movimentacaoAtual.tipo === "saida"
        ? "Saída não autorizada: quantidade superior ao saldo de lotes dentro da validade. Lotes vencidos ou sem validade não podem ser utilizados."
        : "Não foi possível registrar. Verifique o lote, a validade e se o mesmo número já existe com outra validade.");
      return;
    }
    setMensagem(movimentacaoAtual.tipo === "entrada" ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!");
    setMovimentacaoAtual(null);
  }
  const produtoMovimentacao = produtos.find(p => p.id === movimentacaoAtual?.produtoId);
  const classeInput = "w-full border border-slate-300 rounded-xl p-3";
  const classeBotao = "bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2";

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div><h2 className="text-2xl font-bold">Controle de Estoque</h2>
        <p className="text-slate-500 mt-1">Gerencie os insumos e lotes utilizados na cozinha do CAPE.</p>
        <p className="text-xs text-amber-700 mt-2">Ambiente de testes. Utilize apenas dados fictícios.</p></div>
      <button type="button" className={classeBotao} onClick={() => { setFormulario(novoFormulario()); setMostrarFormulario(true); limparAvisos(); }}><Plus size={19}/> Cadastrar insumo</button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[
        { titulo: "Insumos cadastrados", valor: produtos.length, icone: Package },
        { titulo: "Estoque baixo", valor: estoqueBaixo, icone: AlertTriangle },
        { titulo: "Lotes próximos do vencimento", valor: proximos, icone: CalendarClock },
        { titulo: "Lotes vencidos", valor: vencidos, icone: AlertTriangle },
      ].map(({titulo,valor,icone:Icone}) => <div key={titulo} className="bg-white border border-slate-200 rounded-2xl p-5">
        <Icone size={23} className="text-teal-700 mb-3"/><p className="text-sm text-slate-500">{titulo}</p><p className="text-3xl font-bold mt-1">{valor}</p>
      </div>)}
    </div>
    {semValidade > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
      Atenção: {semValidade} lote(s) com saldo não possuem validade informada. Esses lotes ficam bloqueados para saídas comuns.
    </div>}
    {mensagem && <div role="status" className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-800"><CheckCircle2 size={19}/>{mensagem}</div>}
    {erro && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{erro}</div>}

    {mostrarFormulario && <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-semibold">Cadastrar novo insumo</h3>
        <button type="button" onClick={() => setMostrarFormulario(false)} aria-label="Fechar formulário"><X size={22}/></button></div>
      <form onSubmit={cadastrarProduto} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="nome-insumo" className="block text-sm font-medium mb-2">Nome do insumo *</label>
            <input id="nome-insumo" required value={formulario.nome} onChange={e => atualizarCampo("nome",e.target.value)} placeholder="Ex.: Arroz branco" className={classeInput}/></div>
          <div><label htmlFor="categoria-insumo" className="block text-sm font-medium mb-2">Categoria</label>
            <select id="categoria-insumo" value={formulario.categoria} onChange={e => atualizarCampo("categoria",e.target.value)} className={classeInput}>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label htmlFor="unidade-insumo" className="block text-sm font-medium mb-2">Unidade de medida</label>
            <select id="unidade-insumo" value={formulario.unidade} onChange={e => atualizarCampo("unidade",e.target.value)} className={classeInput}>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select></div>
          <div><label htmlFor="quantidade-insumo" className="block text-sm font-medium mb-2">Quantidade inicial *</label>
            <input id="quantidade-insumo" type="number" min="0" step="any" required value={formulario.quantidade} onChange={e => atualizarCampo("quantidade",e.target.value)} className={classeInput}/></div>
          <div><label htmlFor="minimo-insumo" className="block text-sm font-medium mb-2">Estoque mínimo *</label>
            <input id="minimo-insumo" type="number" min="0" step="any" required value={formulario.estoqueMinimo} onChange={e => atualizarCampo("estoqueMinimo",e.target.value)} className={classeInput}/></div>
          <div><label htmlFor="validade-insumo" className="block text-sm font-medium mb-2">Validade do lote inicial (obrigatória se houver quantidade)</label>
            <DataBrasileira id="validade-insumo" value={formulario.validade} onChange={data => atualizarCampo("validade",data)}/></div>
        </div>
        <p className="text-xs text-slate-500">Ao cadastrar uma quantidade inicial maior que zero, será criado o lote LOTE-INICIAL. Novas entregas terão números próprios.</p>
        <div className="flex flex-wrap gap-3"><button type="submit" className={classeBotao}>Salvar insumo</button>
          <button type="button" onClick={() => setMostrarFormulario(false)} className="border border-slate-300 rounded-xl px-5 py-3">Cancelar</button></div>
      </form>
    </section>}

    {movimentacaoAtual && produtoMovimentacao && <section className="bg-white border border-teal-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Registrar {movimentacaoAtual.tipo === "entrada" ? "entrada" : "saída"}</h3>
        <button type="button" onClick={() => setMovimentacaoAtual(null)} aria-label="Fechar movimentação"><X size={22}/></button></div>
      <p className="text-sm text-slate-600 mb-5">Insumo: <strong>{produtoMovimentacao.nome}</strong> • Saldo total: <strong>{produtoMovimentacao.quantidade} {produtoMovimentacao.unidade}</strong></p>
      <form onSubmit={salvarMovimentacao} className="space-y-4">
        <div><label htmlFor="quantidade-movimentacao" className="block text-sm font-medium mb-2">Quantidade ({produtoMovimentacao.unidade}) *</label>
          <input id="quantidade-movimentacao" type="number" min="0.001" step="any" required value={movimentacaoAtual.quantidade}
            onChange={e => setMovimentacaoAtual(a => a ? {...a,quantidade:e.target.value} : null)} className={classeInput}/></div>
        {movimentacaoAtual.tipo === "entrada" ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="numero-lote" className="block text-sm font-medium mb-2">Número do lote *</label>
            <input id="numero-lote" required placeholder="Ex.: AR002" value={movimentacaoAtual.numeroLote}
              onChange={e => setMovimentacaoAtual(a => a ? {...a,numeroLote:e.target.value} : null)} className={classeInput}/></div>
          <div><label htmlFor="validade-lote" className="block text-sm font-medium mb-2">Validade do lote *</label>
            <DataBrasileira id="validade-lote" value={movimentacaoAtual.validade}
              onChange={data => setMovimentacaoAtual(a => a ? {...a,validade:data} : null)}/></div>
        </div> : <p className="text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-xl p-3">
          A saída seguirá PVPS e utilizará somente lotes dentro da validade. Lotes vencidos ou sem validade ficam bloqueados.
        </p>}
        <div><label htmlFor="observacao-movimentacao" className="block text-sm font-medium mb-2">Observação</label>
          <input id="observacao-movimentacao" value={movimentacaoAtual.observacao}
            onChange={e => setMovimentacaoAtual(a => a ? {...a,observacao:e.target.value} : null)}
            placeholder={movimentacaoAtual.tipo === "entrada" ? "Ex.: Recebimento de fornecedor" : "Ex.: Preparo do almoço"} className={classeInput}/></div>
        <button type="submit" className={classeBotao}>Confirmar movimentação</button>
      </form>
    </section>}

    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-lg font-semibold mb-4">Insumos cadastrados</h3>
      <div className="relative mb-5"><Search size={19} className="absolute left-3 top-3 text-slate-400"/>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar insumo..." aria-label="Pesquisar insumo" className="w-full border border-slate-300 rounded-xl py-3 pl-10 pr-4"/></div>
      {produtosFiltrados.length === 0 ? <p className="text-center py-12 text-slate-500">Nenhum insumo encontrado.</p> :
        <div className="space-y-3">{produtosFiltrados.map(produto => {
          const lotesProduto = lotes.filter(l => l.produtoId === produto.id).sort((a,b) => (a.validade || "9999").localeCompare(b.validade || "9999"));
          const comSaldo = lotesProduto.filter(l => l.quantidade > 0);
          const vencidosProduto = comSaldo.filter(l => {const dias = diasAte(l.validade); return dias !== null && dias < 0;});
          const proximosProduto = comSaldo.filter(l => {const dias = diasAte(l.validade); return dias !== null && dias >= 0 && dias <= 7;});
          const disponivel = comSaldo.filter(l => l.validade && l.validade >= hojeISO()).reduce((s,l) => s + l.quantidade,0);
          const aberto = lotesAbertos.includes(produto.id);
          return <div key={produto.id} className="border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div><h4 className="font-semibold">{produto.nome}</h4><p className="text-sm text-slate-500 mt-1">{produto.categoria}</p>
                <p className="text-sm mt-2">Saldo total: <strong>{produto.quantidade} {produto.unidade}</strong> • Mínimo: {produto.estoqueMinimo} {produto.unidade}</p>
                <p className="text-sm text-slate-600 mt-1">Disponível dentro da validade: <strong>{disponivel} {produto.unidade}</strong></p>
                <p className="text-sm text-slate-500 mt-1">Próxima validade: {formatarData(produto.validade)}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {produto.quantidade <= produto.estoqueMinimo && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs">Estoque baixo</span>}
                  {vencidosProduto.length > 0 && <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs">Lote vencido</span>}
                  {proximosProduto.length > 0 && <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs">Validade próxima</span>}
                  {comSaldo.some(l => !l.validade) && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs">Lote sem validade</span>}
                  {disponivel === 0 && produto.quantidade > 0 && <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs">Sem saldo liberado para consumo</span>}
                  {produto.quantidade > produto.estoqueMinimo && vencidosProduto.length === 0 && proximosProduto.length === 0 && !comSaldo.some(l=>!l.validade) && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">Estoque regular</span>}
                </div></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => abrirMovimentacao(produto.id,"entrada")} className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl flex items-center gap-2"><ArrowDownToLine size={17}/>Entrada</button>
                <button type="button" onClick={() => abrirMovimentacao(produto.id,"saida")} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-2"><ArrowUpFromLine size={17}/>Saída</button>
                <button type="button" onClick={() => setLotesAbertos(a => aberto ? a.filter(id=>id!==produto.id) : [...a,produto.id])} className="border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2"><Layers3 size={17}/>{aberto ? "Ocultar lotes" : `Ver lotes (${lotesProduto.length})`}</button>
                <button type="button" onClick={() => removerProduto(produto)} className="border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2"><Trash2 size={17}/>Excluir</button>
              </div>
            </div>
            {aberto && <div className="overflow-x-auto border border-slate-200 rounded-xl">
              {lotesProduto.length === 0 ? <p className="p-4 text-sm text-slate-500">Nenhum lote registrado.</p> : <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr><th className="p-3">Lote</th><th className="p-3">Quantidade</th><th className="p-3">Validade</th><th className="p-3">Situação</th></tr></thead>
                <tbody>{lotesProduto.map(l => {const dias = diasAte(l.validade); const situacao = l.quantidade <= 0 ? "Esgotado" : dias === null ? "Sem validade" : dias < 0 ? "Vencido — bloqueado" : dias <= 7 ? "Vence em até 7 dias" : "Dentro da validade";
                  return <tr key={l.id} className="border-t border-slate-200"><td className="p-3">{l.numero}</td><td className="p-3">{l.quantidade} {produto.unidade}</td><td className="p-3">{formatarData(l.validade)}</td><td className="p-3">{situacao}</td></tr>;})}</tbody>
              </table>}
            </div>}
          </div>;
        })}</div>}
    </section>

    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4"><History size={22} className="text-teal-700"/><h3 className="text-lg font-semibold">Histórico de movimentações</h3></div>
      {movimentacoes.length === 0 ? <p className="text-slate-500 text-sm py-6">Nenhuma movimentação registrada.</p> : <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600"><tr>
          <th className="p-3">Data e hora</th><th className="p-3">Insumo</th><th className="p-3">Tipo</th><th className="p-3">Quantidade</th><th className="p-3">Lotes utilizados</th><th className="p-3">Observação</th>
        </tr></thead><tbody>{movimentacoes.map(m => <tr key={m.id} className="border-t border-slate-200">
          <td className="p-3">{new Date(m.data).toLocaleString("pt-BR")}</td><td className="p-3">{m.produtoNome}</td>
          <td className={`p-3 font-medium ${m.tipo === "entrada" ? "text-green-700" : "text-amber-700"}`}>{m.tipo === "entrada" ? "Entrada" : "Saída"}</td>
          <td className="p-3">{m.quantidade} {m.unidade}</td>
          <td className="p-3">{m.lotes.length ? m.lotes.map(l => `${l.numero}: ${l.quantidade} ${m.unidade}`).join("; ") : "—"}</td>
          <td className="p-3">{m.observacao || "—"}</td>
        </tr>)}</tbody></table>
      </div>}
    </section>
  </div>;
}
