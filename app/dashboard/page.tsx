'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [transacoesFiltradas, setTransacoesFiltradas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'tudo' | 'semana' | 'mes'>('tudo');

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    setLoading(true);
    const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: false });
    const { data: c } = await supabase.from('categorias').select('*');
    const { data: co } = await supabase.from('contas').select('*');
    if (t) { setTransacoes(t); aplicarFiltro(t, filtroPeriodo); }
    if (c) setCategorias(c);
    if (co) setContas(co);
    setLoading(false);
  }

  function aplicarFiltro(dados: any[], periodo: 'tudo' | 'semana' | 'mes') {
    const hoje = new Date();
    if (periodo === 'tudo') { setTransacoesFiltradas(dados); } 
    else {
      const limite = new Date();
      if (periodo === 'semana') limite.setDate(hoje.getDate() - 7);
      const filtrado = dados.filter(t => {
        const dT = new Date(t.data_transacao + 'T00:00:00');
        return periodo === 'semana' ? dT >= limite : dT.getMonth() === hoje.getMonth() && dT.getFullYear() === hoje.getFullYear();
      });
      setTransacoesFiltradas(filtrado);
    }
  }

  useEffect(() => { carregarDados(); }, []);
  useEffect(() => { aplicarFiltro(transacoes, filtroPeriodo); }, [filtroPeriodo, transacoes]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) return alert('Preencha os campos obrigatórios!');
    setSalvando(true);
    const { error } = await supabase.from('transacoes').insert([{
      descricao, valor: parseFloat(valor), tipo, categoria_id: parseInt(categoriaId), conta_id: parseInt(contaId), forma_pagamento: formaPagamento, data_transacao: dataTransacao, status: 'CONCRETIZADO'
    }]);
    setSalvando(false);
    if (error) alert('Erro: ' + error.message);
    else { alert('Sucesso!'); setDescricao(''); setValor(''); setCategoriaId(''); carregarDados(); }
  }

  if (loading) return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Paróquia...</div>;

  const saldoInicialCaixa = 3146.95;
  const saldoInicialBanco = 100675.04;
  const saldoInicialTotal = saldoInicialCaixa + saldoInicialBanco;
  
  let entCaixa = 0, saiCaixa = 0, entBanco = 0, saiBanco = 0;
  transacoesFiltradas.forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') { t.conta_id === 1 ? entCaixa += v : entBanco += v; }
    else { t.conta_id === 1 ? saiCaixa += v : saiBanco += v; }
  });

  const totEntradas = entCaixa + entBanco;
  const totSaidas = saiCaixa + saiBanco;
  const saldoFinalTotal = saldoInicialTotal + totEntradas - totSaidas;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Paróquia Santo Expedito</h1>
          <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa</p>
        </div>
        <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
          {['tudo', 'semana', 'mes'].map((p: any) => (
            <button key={p} onClick={() => setFiltroPeriodo(p)} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${filtroPeriodo === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>{p === 'tudo' ? 'Tudo' : p === 'semana' ? 'Esta Semana' : 'Este Mês'}</button>
          ))}
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4">📝 Novo Lançamento Paroquial</h2>
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Movimento</label>
            <select value={tipo} onChange={(e: any) => { setTipo(e.target.value); setCategoriaId(''); }} className="w-full border p-2 rounded-lg bg-gray-50"><option value="ENTRADA">ENTRADA (Receitas)</option><option value="SAIDA">SAIDA (Despesas)</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Categoria Paroquial</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50"><option value="">Selecione...</option>{categorias.filter(c => c.tipo === tipo).map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Conta Destino/Origem</label>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50"><option value="">Selecione...</option>{contas.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50"><option value="Dinheiro">Dinheiro</option><option value="PIX">PIX</option><option value="Cartão">Cartão</option><option value="Boleto/Transferência">Boleto/Transferência</option></select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Nome / Observação / Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Dízimo Família Silva" className="w-full border p-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full border p-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data da Transação</label>
            <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full border p-2 rounded-lg" />
          </div>
          <div className="md:col-span-3 lg:col-span-4 flex justify-end pt-2">
            <button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400">{salvando ? 'Salvando...' : '✨ Registrar no Fluxo'}</button>
          </div>
        </form>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center font-bold">
        <div className="bg-white p-4 rounded-xl border"><p className="text-xs text-gray-400 uppercase">Saldo Inicial Total</p><p className="text-xl text-gray-700">R$ {saldoInicialTotal.toFixed(2)}</p></div>
        <div className="bg-white p-4 rounded-xl border"><p className="text-xs text-emerald-500 uppercase">Total Entradas</p><p className="text-xl text-emerald-600">R$ {totEntradas.toFixed(2)}</p></div>
        <div className="bg-white p-4 rounded-xl border"><p className="text-xs text-rose-500 uppercase">Total Saídas</p><p className="text-xl text-rose-600">R$ {totSaidas.toFixed(2)}</p></div>
        <div className="bg-white p-4 rounded-xl border"><p className="text-xs text-blue-500 uppercase">Saldo Final Estimado</p><p className="text-xl text-blue-600">R$ {saldoFinalTotal.toFixed(2)}</p></div>
      </div>

      {/* TABELA DE HISTÓRICO COMPLETA E FECHADA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <h2 className="text-xl font-bold text-gray-700 mb-4">📋 Lançamentos Recentes</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-400 uppercase text-xs">
              <th className="pb-3">Data</th>
              <th className="pb-3">Descrição</th>
              <th className="pb-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-600">
            {transacoesFiltradas.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3">{new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="py-3 font-medium text-gray-800">{t.descricao}</td>
                <td className={`py-3 text-right font-bold ${t.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                </td>
              </tr>
            ))}
            {transacoesFiltradas.length === 0 && (
              <tr>