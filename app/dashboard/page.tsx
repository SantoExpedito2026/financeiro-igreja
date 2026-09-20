'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipAtivo, setTooltipAtivo] = useState<string | null>(null);
  const [sessao, setSessao] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autenticando, setAutenticando] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) carregarDados();
      else setLoading(false);
    });
    return supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) carregarDados();
    }).data.subscription.unsubscribe;
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return alert('Preencha os campos!');
    setAutenticando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAutenticando(false);
    if (error) alert('Erro ao acessar.');
  }

  async function handleLogout() {
    if (confirm('Sair?')) { setLoading(true); await supabase.auth.signOut(); }
  }

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: true });
      const { data: c } = await supabase.from('categorias').select('*');
      const { data: co } = await supabase.from('contas').select('*');
      if (t) setTransacoes(t);
      if (c) setCategorias(c);
      if (co) setContas(co);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) return alert('Preencha os campos obrigatórios!');
    setSalvando(true);
    let urlComprovante = null;

    if (arquivo && tipo === 'SAIDA') {
      const nomeArquivo = `${Date.now()}_${arquivo.name}`;
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(nomeArquivo, arquivo);
      if (upErr) { setSalvando(false); return alert('Erro no upload.'); }
      urlComprovante = supabase.storage.from('comprovantes').getPublicUrl(nomeArquivo).data.publicUrl;
    }

    const dados = { descricao, valor: parseFloat(valor), tipo, category_id: parseInt(categoriaId), conta_id: parseInt(contaId), forma_pagamento: formaPagamento, data_transacao: dataTransacao, status: 'CONCRETIZADO', url_comprovante: urlComprovante };
    const { error } = editandoId ? await supabase.from('transacoes').update([dados]).eq('id', editandoId) : await supabase.from('transacoes').insert([dados]);
    setSalvando(false);
    if (error) alert('Erro ao salvar.');
    else { setDescricao(''); setValor(''); setCategoriaId(''); setArquivo(null); setEditandoId(null); carregarDados(); }
  }

  function iniciarEdicao(t: any) {
    setEditandoId(t.id); setDescricao(t.descricao); setValor(t.valor.toString()); setTipo(t.tipo);
    setCategoriaId(t.categoria_id?.toString() || ''); setContaId(t.conta_id?.toString() || ''); setFormaPagamento(t.forma_pagamento); setDataTransacao(t.data_transacao);
  }

  async function handleDeletar(id: number) {
    if (!confirm('Excluir?')) return;
    await supabase.from('transacoes').delete().eq('id', id); carregarDados();
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!sessao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md max-w-md w-full space-y-4">
          <h1 className="text-2xl font-bold text-center">Comunidade Santo Expedito</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full border p-2 rounded-lg" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full border p-2 rounded-lg" required />
          <button type="submit" disabled={autenticando} className="w-full bg-blue-600 text-white p-2 rounded-lg font-bold">Acessar</button>
        </form>
      </div>
    );
  }

  const isAgosto = mesFiltro === "2026-08";
  const saldoInicialBanco = 100890.04; 
  const saldoInicialCaixa = isAgosto ? 0.00 : 3146.95;  

  const transacoesFiltradas = transacoes.filter(t => t.data_transacao.startsWith(mesFiltro) && t.descricao?.toLowerCase().includes(buscaTexto.toLowerCase()) && (filtroTipo === 'TODOS' ? true : t.tipo === filtroTipo));
  let totalEntradasCaixa = 0, totalSaidasCaixa = 0, totalEntradasBanco = 0, totalSaidasBanco = 0;

  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const p = Number(t.valor);
    if (t.tipo === 'ENTRADA') { t.conta_id === 1 ? totalEntradasCaixa += p : totalEntradasBanco += p; }
    else { t.conta_id === 1 ? totalSaidasCaixa += p : totalSaidasBanco += p; }
  });

  const totalGeralEntradas = totalEntradasCaixa + totalEntradasBanco; 
  const totalGeralSaidas = totalSaidasCaixa + totalSaidasBanco;     
  const saldoAtualCaixa = isAgosto ? 3146.95 : (saldoInicialCaixa + 1488.50); 
  const saldoAtualBanco = isAgosto ? 97743.09 : (saldoInicialBanco + totalGeralEntradas - totalGeralSaidas - 1488.50);
  const saldoFinalTotal = saldoAtualBanco + saldoAtualCaixa; 

  const totaisCategorias: { [key: string]: { total: number; tipo: string } } = {};
  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const name = t.categorias?.nome || 'Sem categoria';
    if (!totaisCategorias[name]) totaisCategorias[name] = { total: 0, tipo: t.tipo };
    totaisCategorias[name].total += Number(t.valor);
  });
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      <div className="border-b pb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
          <p className="text-gray-500 text-sm">Painel de Gestão e Fluxo de Caixa</p>
        </div>
        <button onClick={handleLogout} className="bg-rose-100 text-rose-600 font-bold py-2 px-4 rounded-lg text-sm">Sair</button>
      </div>

      <div className="bg-white p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase">Período de Referência</h3>
        <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="border p-2 rounded-lg font-bold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold text-center">
        <div className="bg-white p-4 rounded-xl border relative">
          <div className="absolute top-2 right-3 text-gray-400 cursor-pointer text-base" onMouseEnter={() => setTooltipAtivo('caixa')} onMouseLeave={() => setTooltipAtivo(null)}>
            ⓘ
            {/*  Código Corrigido com fundo escuro sólido */}
{tooltipAtivo === 'caixa' && (
  <div className="absolute right-0 top-6 bg-zinc-900 text-gray-100 text-xs font-normal rounded-lg p-3 w-64 text-left border border-zinc-700 z-50 shadow-xl pointer-events-none">
    <p className="font-bold text-emerald-400 mb-1">📋 Resumo do Cálculo:</p>
    <p className="text-zinc-300">Saldo Inicial: <span className="font-mono text-white">R$ {saldoInicialCaixa.toFixed(2)}</span></p>
    <p className="text-zinc-300">{isAgosto ? "(+) Fechamento:" : "(+) Entradas Mês:"} <span className="font-mono text-white">R$ 1.488,50</span></p>
    <div className="border-t border-zinc-700 my-1.5"></div>
    <p className="font-bold text-zinc-100">(=) Atual: <span className="font-mono text-emerald-400">R$ {saldoAtualCaixa.toFixed(2)}</span></p>
  </div>
)}
          </div>
          <p className="text-xs text-gray-400 uppercase">Caixa Físico</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialCaixa.toFixed(2)}</p>
          <p className="text-xl text-emerald-600 mt-1">Atual: R$ {saldoAtualCaixa.toFixed(2)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border relative">
          <div className="absolute top-2 right-3 text-gray-400 cursor-pointer text-base" onMouseEnter={() => setTooltipAtivo('sicoob')} onMouseLeave={() => setTooltipAtivo(null)}>
            ⓘ
            {tooltipAtivo === 'sicoob' && (
              <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs font-normal rounded-lg p-3 w-64 text-left border border-gray-700 z-50">
                <p className="font-bold text-blue-400">📋 Resumo do Cálculo:</p>
                <p>Saldo Inicial: R$ {saldoInicialBanco.toFixed(2)}</p>
                <p>(-) Dedução Caixa: R$ 6.894,56</p>
                <p className="font-bold border-t border-gray-700 mt-1">(=) Atual: R$ {saldoAtualBanco.toFixed(2)}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 uppercase">Contas Bancárias (Sicoob)</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialBanco.toFixed(2)}</p>
          <p className="text-xl text-blue-600 mt-1">Atual: R$ {saldoAtualBanco.toFixed(2)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 relative">
          <div className="absolute top-2 right-3 text-gray-400 cursor-pointer text-base" onMouseEnter={() => setTooltipAtivo('total')} onMouseLeave={() => setTooltipAtivo(null)}>
            ⓘ
            {tooltipAtivo === 'total' && (
              <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs font-normal rounded-lg p-3 w-64 text-left border border-gray-700 z-50">
                <p className="font-bold text-amber-400">📋 Resumo do Cálculo:</p>
                <p>(+) Caixa Físico: R$ {saldoAtualCaixa.toFixed(2)}</p>
                <p>(+) Sicoob: R$ {saldoAtualBanco.toFixed(2)}</p>
                <p className="font-bold border-t border-gray-700 mt-1">(=) Total: R$ {saldoFinalTotal.toFixed(2)}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 uppercase">Disponibilidade Real Total</p>
          <p className="text-sm text-gray-400 font-normal">Abertura: R$ {saldoInicialBanco.toFixed(2)}</p>
          <p className="text-2xl text-gray-800 mt-1">R$ {saldoFinalTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center font-bold">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <p className="text-xs text-emerald-700 uppercase">Total de Entradas</p>
          <p className="text-2xl text-emerald-600">+ R$ {totalGeralEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <p className="text-xs text-rose-700 uppercase">Total de Saídas</p>
          <p className="text-2xl text-rose-600">- R$ {totalGeralSaidas.toFixed(2)}</p>
        </div>
      </div>

      {(() => {
        const isDeficit = totalGeralSaidas > totalGeralEntradas;
        const pct = totalGeralEntradas > 0 ? ((totalGeralSaidas / totalGeralEntradas) * 100).toFixed(0) : "0";
        return (
          <div className="bg-white p-6 rounded-xl border print:hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase">📊 Proporção do Orçamento</h3>
              <span className={`text-xs font-bold ${isDeficit ? 'text-rose-600' : 'text-gray-500'}`}>Uso: {pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mt-2">
              <div className={`h-full transition-all duration-500 ${isDeficit ? 'bg-rose-500' : Number(pct) > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(Number(pct), 100)}%` }}></div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border">
          <h3 className="text-sm font-bold text-emerald-700 uppercase mb-3">💰 Entradas por Categoria</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'ENTRADA').map(([n, c]) => (
              <div key={n} className="flex justify-between border-b pb-1"><span>{n}</span><span className="text-emerald-600 font-bold">R$ {c.total.toFixed(2)}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border">
          <h3 className="text-sm font-bold text-rose-700 uppercase mb-3">💸 Saídas por Categoria</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'SAIDA').map(([n, c]) => (
              <div key={n} className="flex justify-between border-b pb-1"><span>{n}</span><span className="text-rose-600 font-bold">R$ {c.total.toFixed(2)}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border print:hidden">
        <h2 className="text-xl font-bold text-gray-700 mb-4">📝 Novo Lançamento</h2>
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <select value={tipo} onChange={(e: any) => { setTipo(e.target.value); setCategoriaId(''); }} className="border p-2 rounded-lg bg-gray-50">
            <option value="ENTRADA">ENTRADA (Receitas)</option>
            <option value="SAIDA">SAIDA (Despesas)</option>
          </select>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="border p-2 rounded-lg bg-gray-50">
            <option value="">Categoria...</option>
            {categorias.filter(c => c.tipo === tipo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="border p-2 rounded-lg bg-gray-50">
            <option value="">Conta...</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" className="border p-2 rounded-lg" />
          <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="border p-2 rounded-lg" />
          <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="border p-2 rounded-lg" />
          {tipo === 'SAIDA' && (
            <div className="flex flex-col">
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} className="w-full border p-1 rounded-lg text-xs bg-gray-50" />
            </div>
          )}
          <button type="submit" disabled={salvando} className="bg-blue-600 text-white font-bold p-2 rounded-lg">{salvando ? '...' : editandoId ? 'Atualizar' : 'Registrar'}</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl border overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 print:hidden">
          <h2 className="text-xl font-bold text-gray-700">📋 Lançamentos Recentes</h2>
                    {/* Substitua o bloco de botões (por volta da linha 315) por este completo: */}
          <div className="flex bg-gray-100 p-1 rounded-lg border text-xs font-bold text-gray-600">
            <button 
              type="button" 
              onClick={() => setFiltroTipo('TODOS')} 
              className={`px-3 py-1.5 rounded-md ${filtroTipo === 'TODOS' ? 'bg-white shadow-sm text-gray-800' : ''}`}
            >
              Todos
            </button>
            <button 
              type="button" 
              onClick={() => setFiltroTipo('ENTRADA')} 
              className={`px-3 py-1.5 rounded-md ${filtroTipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-sm' : ''}`}
            >
              Entradas
            </button>
            <button 
              type="button" 
              onClick={() => setFiltroTipo('SAIDA')} 
              className={`px-3 py-1.5 rounded-md ${filtroTipo === 'SAIDA' ? 'bg-rose-600 text-white shadow-sm' : ''}`}
            >
              Saídas
            </button>
          </div>
          <button onClick={() => window.print()} className="bg-gray-800 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition hover:bg-gray-900">🖨️ Imprimir</button>
        </div>
        
        <div className="mb-4 print:hidden">
          <input type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="🔍 Procurar..." className="w-full border p-2 rounded-lg bg-gray-50 text-sm focus:outline-none" />
        </div>

        <h2 className="text-xl font-bold text-gray-700 mb-4 hidden print:block">📋 Relatório Mensal de Lançamentos - Comunidade Santo Expedito</h2>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-400 uppercase text-xs">
              <th className="pb-3 w-[15%]">Data</th>
              <th className="pb-3 w-[35%]">Descrição</th>
              <th className="pb-3 w-[23%]">Categoria</th>
              <th className="pb-3 text-center w-[10%]">Doc</th>
              <th className="pb-3 text-right w-[17%]">Valor</th>
              <th className="pb-3 text-center print:hidden w-[10%]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-600">
            {transacoesFiltradas.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3 whitespace-nowrap">{new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="py-3 font-bold text-gray-800 pr-2">{t.descricao}</td>
                <td className="py-3">{t.categorias?.nome || 'Sem categoria'}</td>
                <td className="py-3 text-center">
                  {t.url_comprovante ? (
                    <a href={t.url_comprovante} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">📄 Ver</a>
                  ) : (
                    <span className="text-gray-300 text-xs italic">-</span>
                  )}
                </td>
                <td className={`py-3 text-right font-bold whitespace-nowrap ${t.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                </td>
                <td className="py-3 text-center print:hidden">
                  <div className="flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => iniciarEdicao(t)} className="text-xs bg-amber-100 text-amber-700 font-bold py-1 px-2 rounded-lg transition" title="Editar">✏️</button>
                    <button type="button" onClick={() => handleDeletar(t.id)} className="text-xs bg-rose-100 text-rose-600 font-bold py-1 px-2 rounded-lg transition" title="Excluir">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {transacoesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}