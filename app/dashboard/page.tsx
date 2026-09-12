'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  // Estados de dados e carregamento
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de controle de Autenticação (Login)
  const [sessao, setSessao] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autenticando, setAutenticando] = useState(false);

  // Estados do formulário financeiro
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);
  
  // Estados dos Filtros Inteligentes
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // 1. Monitorar o estado do login do usuário
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) carregarDados();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) carregarDados();
      else {
        setTransacoes([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Função para realizar o login por e-mail e senha
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return alert('Preencha o e-mail e a senha!');
    
    setAutenticando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAutenticando(false);

    if (error) {
      alert('Erro ao acessar: Senha incorreta ou e-mail inválido.');
    }
  }

  // 3. Função para fazer Logout (Sair com segurança)
  async function handleLogout() {
    if (confirm('Deseja realmente sair do sistema financeiro?')) {
      setLoading(true);
      await supabase.auth.signOut();
    }
  }

  // 4. Carregar dados e ordenar por data crescente
  async function carregarDados() {
    setLoading(true);
    try {
      const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: true });
      const { data: c } = await supabase.from('categorias').select('*');
      const { data: co } = await supabase.from('contas').select('*');
      if (t) setTransacoes(t);
      if (c) setCategorias(c);
      if (co) setContas(co);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) {
      return alert('Por favor, preencha todos os campos obrigatórios!');
    }
    setSalvando(true);

    const dadosTransacao = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria_id: parseInt(categoriaId),
      conta_id: parseInt(contaId),
      forma_pagamento: formaPagamento,
      data_transacao: dataTransacao,
      status: 'CONCRETIZADO'
    };

    let error = null;
    if (editandoId) {
      const { error: err } = await supabase.from('transacoes').update([dadosTransacao]).eq('id', editandoId);
      error = err;
    } else {
      const { error: err } = await supabase.from('transacoes').insert([dadosTransacao]);
      error = err;
    }

    setSalvando(false);
    if (error) {
      alert('Erro ao salvar/atualizar: ' + error.message);
    } else {
      alert(editandoId ? 'Lançamento atualizado com sucesso!' : 'Lançamento registrado com sucesso!');
      setDescricao('');
      setValor('');
      setCategoriaId('');
      setEditandoId(null);
      carregarDados();
    }
  }

  function iniciarEdicao(t: any) {
    setEditandoId(t.id);
    setDescricao(t.descricao);
    setValor(t.valor.toString());
    setTipo(t.tipo);
    setCategoriaId(t.categoria_id.toString());
    setContaId(t.conta_id.toString());
    setFormaPagamento(t.forma_pagamento);
    setDataTransacao(t.data_transacao);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Função para limpar todos os campos do formulário e sair do modo edição
  function limparFormulario() {
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setEditandoId(null);
  }

  async function handleDeletar(id: number) {
    if (!confirm('Deseja realmente excluir este lançamento do fluxo de caixa?')) {
      return;
    }
    try {
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir do banco: ' + error.message);
      } else {
        alert('Lançamento excluído com sucesso!');
        carregarDados();
      }
    } catch (error) {
      console.error("Erro na operação:", error);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Comunidade...</div>;
  }
  // TELA DE BLOQUEIO / FORMULÁRIO DE LOGIN (Exibido se o usuário não estiver logado)
  if (!sessao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
        <div className="bg-white p-8 rounded-xl shadow-md border max-w-md w-full space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <img src="/Logo.jpg" alt="Logo Santo Expedito" className="h-24 w-24 object-contain rounded-full mix-blend-multiply" />
            <h1 className="text-2xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
            <p className="text-sm text-gray-500">Gestão Contábil e Fluxo de Caixa</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail Administrativo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@gmail.com" className="w-full border p-2 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha de Acesso</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border p-2 rounded-lg" required />
            </div>
            <button type="submit" disabled={autenticando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition disabled:bg-gray-400">
              {autenticando ? 'Autenticando...' : '🔐 Acessar Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // CÁLCULOS LÓGICOS DO PAINEL FINANCEIRO (PROTEGIDO)
  const saldoInicialCaixa = 3146.95;
  const saldoInicialBanco = 97743.09;
  const saldoInicialTotal = saldoInicialCaixa + saldoInicialBanco;

  // Lógica de Filtro Combinado: Mês + Texto + Tipo de Movimentação (Entrada/Saída)
  const transacoesFiltradas = transacoes.filter(t => {
    const correspondeAoMes = t.data_transacao.startsWith(mesFiltro);
    const correspondeAoTexto = t.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
    const correspondeAoTipo = filtroTipo === 'TODOS' ? true : t.tipo === filtroTipo;
    return correspondeAoMes && correspondeAoTexto && correspondeAoTipo;
  });

  let totalEntradasCaixa = 0;
  let totalSaidasCaixa = 0;
  let totalEntradasBanco = 0;
  let totalSaidasBanco = 0;

  // IMPORTANTE: Os totais dos cards no topo continuam somando o mês inteiro independente do botão clicado abaixo
  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') {
      t.conta_id === 1 ? totalEntradasCaixa += v : totalEntradasBanco += v;
    } else {
      t.conta_id === 1 ? totalSaidasCaixa += v : totalSaidasBanco += v;
    }
  });

  const totalGeralEntradas = totalEntradasCaixa + totalEntradasBanco;
  const totalGeralSaidas = totalSaidasCaixa + totalSaidasBanco;
  const saldoAtualCaixa = saldoInicialCaixa + totalEntradasCaixa - totalSaidasCaixa;
  const saldoAtualBanco = saldoInicialBanco + totalEntradasBanco - totalSaidasBanco;
  const saldoFinalTotal = saldoInicialTotal + totalGeralEntradas - totalGeralSaidas;
  const porcentagemDespesas = totalGeralEntradas > 0 ? Math.min((totalGeralSaidas / totalGeralEntradas) * 100, 100) : 0;

  const totaisCategorias: { [key: string]: { total: number; tipo: string } } = {};
  transacoes.filter(t => t.data_transacao.startsWith(mesFiltro)).forEach(t => {
    const nomeCat = t.categorias?.nome || t.categories?.nome || 'Sem categoria';
    if (!totaisCategorias[nomeCat]) {
      totaisCategorias[nomeCat] = { total: 0, tipo: t.tipo };
    }
    totaisCategorias[nomeCat].total += Number(t.valor);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* CABEÇALHO COM LOGO E BOTÃO DE LOGOUT */}
      <div className="border-b pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/Logo.jpg" alt="Logo da Comunidade" className="h-28 w-28 object-contain rounded-full mix-blend-multiply" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Comunidade Santo Expedito</h1>
            <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa da Comunidade</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold py-2 px-4 rounded-lg text-sm transition print:hidden flex items-center gap-1">
          🚪 Sair
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase">Período de Referência</h3>
          <p className="text-xs text-gray-400">Escolha o mês para visualizar o fluxo de caixa paroquial</p>
        </div>
        <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="border p-2 rounded-lg bg-gray-50 text-gray-700 font-bold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold text-center">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Caixa Físico Paroquial</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialCaixa.toFixed(2)}</p>
          <p className="text-xl text-emerald-600 mt-1">Atual: R$ {saldoAtualCaixa.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 uppercase">Contas Bancárias (Sicoob)</p>
          <p className="text-sm text-gray-500 font-normal">Inicial: R$ {saldoInicialBanco.toFixed(2)}</p>
          <p className="text-xl text-blue-600 mt-1">Atual: R$ {saldoAtualBanco.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm bg-gradient-to-br from-gray-50 to-gray-100">
          <p className="text-xs text-gray-500 uppercase">Disponibilidade Real Total</p>
          <p className="text-sm text-gray-400 font-normal">Abertura: R$ {saldoInicialTotal.toFixed(2)}</p>
          <p className="text-2xl text-gray-800 mt-1">R$ {saldoFinalTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center font-bold">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <p className="text-xs text-emerald-700 uppercase">Total de Entradas no Período</p>
          <p className="text-2xl text-emerald-600">+ R$ {totalGeralEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <p className="text-xs text-rose-700 uppercase">Total de Saídas no Período</p>
          <p className="text-2xl text-rose-600">- R$ {totalGeralSaidas.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-500 uppercase">📊 Proporção do Orçamento Mensal</h3>
          <span className="text-xs font-bold text-gray-400">Uso das Receitas: {porcentagemDespesas.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mt-2">
          <div className="h-full rounded-full transition-all duration-500 bg-emerald-500" style={{ width: `${porcentagemDespesas}%` }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 font-medium mt-2">
          <p>🟢 Ideal: Despesas abaixo de 70%</p>
          <p className={totalGeralSaidas > totalGeralEntradas ? "text-rose-500 font-bold" : ""}>
            {totalGeralSaidas > totalGeralEntradas ? "⚠️ Atenção: Deficit no mês!" : "✅ Caixa em equilíbrio"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-emerald-700 uppercase mb-3">💰 Entradas por Categoria</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'ENTRADA').map(([nome, c]) => (
              <div key={nome} className="flex justify-between border-b pb-1">
                <span className="text-gray-600 font-medium">{nome}</span>
                <span className="text-emerald-600 font-bold">R$ {c.total.toFixed(2)}</span>
              </div>
            ))}
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'ENTRADA').length === 0 && (
              <p className="text-gray-400 text-xs italic">Nenhuma receita registrada neste mês.</p>
            )}
          </div>
        </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-rose-700 uppercase mb-3">💸 Saídas por Categoria</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'SAIDA').map(([nome, c]) => (
              <div key={nome} className="flex justify-between border-b pb-1">
                <span className="text-gray-600 font-medium">{nome}</span>
                <span className="text-rose-600 font-bold">R$ {c.total.toFixed(2)}</span>
              </div>
            ))}
            {Object.entries(totaisCategorias).filter(([_, c]) => c.tipo === 'SAIDA').length === 0 && (
              <p className="text-gray-400 text-xs italic">Nenhuma despesa registrada neste mês.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden">
        <h2 className="text-xl font-bold text-gray-700 mb-4">📝 Novo Lançamento Paroquial</h2>
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Movimento</label>
            <select value={tipo} onChange={(e: any) => { setTipo(e.target.value); setCategoriaId(''); }} className="w-full border p-2 rounded-lg bg-gray-50">
              <option value="ENTRADA">ENTRADA (Receitas)</option>
              <option value="SAIDA">SAIDA (Despesas)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Categoria Paroquial</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
              <option value="">Selecione...</option>
              {categorias.filter(c => c.tipo === tipo).map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Conta de Destino/Origem</label>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
              <option value="">Selecione...</option>
              {contas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto/Transferência">Boleto/Transferência</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Descrição / Nome do Fiel</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Dízimo Familiar ou Coleta da Missa" className="w-full border p-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full border p-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data da Transação</label>
            <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full border p-2 rounded-lg" />
          </div>
                   <div className="md:col-span-3 lg:col-span-4 flex justify-end gap-2 pt-2">
            {(descricao || valor || editandoId) && (
              <button 
                type="button" 
                onClick={limparFormulario} 
                className="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-lg transition"
              >
                ❌ Cancelar
              </button>
            )}
            <button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition">
              {salvando ? 'Salvando...' : editandoId ? '✨ Atualizar Lançamento' : '✨ Registrar no Fluxo'}
            </button>
          </div>

        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 print:hidden">
          <h2 className="text-xl font-bold text-gray-700">📋 Lançamentos Recentes</h2>
          
          {/* BOTÕES DE FILTRO POR TIPO (ENTRADAS / SAÍDAS) */}
          <div className="flex bg-gray-100 p-1 rounded-lg border text-xs font-bold text-gray-600">
            <button type="button" onClick={() => setFiltroTipo('TODOS')} className={`px-3 py-1.5 rounded-md transition ${filtroTipo === 'TODOS' ? 'bg-white text-gray-800 shadow-sm' : 'hover:text-gray-900'}`}>
              Todos
            </button>
            <button type="button" onClick={() => setFiltroTipo('ENTRADA')} className={`px-3 py-1.5 rounded-md transition ${filtroTipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-emerald-600'}`}>
              🟢 Entradas
            </button>
            <button type="button" onClick={() => setFiltroTipo('SAIDA')} className={`px-3 py-1.5 rounded-md transition ${filtroTipo === 'SAIDA' ? 'bg-rose-600 text-white shadow-sm' : 'hover:text-rose-600'}`}>
              🔴 Saídas
            </button>
          </div>

          <button onClick={() => window.print()} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition flex items-center gap-2 self-end sm:self-auto">
            🖨️ Imprimir Relatório Mensal
          </button>
        </div>

        <div className="mb-4 print:hidden">
          <input type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="🔍 Procurar por nome de fiel, fornecedor ou descrição..." className="w-full border p-2 rounded-lg bg-gray-50 text-sm shadow-sm" />
        </div>

        <h2 className="text-xl font-bold text-gray-700 mb-4 hidden print:block">📋 Relatório Mensal de Lançamentos - Comunidade Santo Expedito</h2>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-400 uppercase text-xs">
              <th className="pb-3">Data</th>
              <th className="pb-3">Descrição</th>
              <th className="pb-3">Categoria</th>
              <th className="pb-3">Conta</th>
              <th className="pb-3 text-right">Valor</th>
              <th className="pb-3 text-center print:hidden">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-600">
            {transacoesFiltradas.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3">{new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="py-3 font-medium text-gray-800">{t.descricao}</td>
                <td className="py-3">{t.categorias?.nome || t.categories?.nome || 'Sem categoria'}</td>
                <td className="py-3">{t.contas?.nome || 'Sem conta'}</td>
                <td className={`py-3 text-right font-bold ${t.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                </td>
                <td className="py-3 text-center space-x-2 print:hidden">
                  <button onClick={() => iniciarEdicao(t)} className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold py-1 px-2 rounded-lg transition">✏️ Alterar</button>
                  <button onClick={() => handleDeletar(t.id)} className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold py-1 px-2 rounded-lg transition">🗑️ Excluir</button>
                </td>
              </tr>
            ))}
            {transacoesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">Nenhum lançamento encontrado para este período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}