'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  // Estados para armazenar os dados do banco
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para as informações do formulário de novos lançamentos
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().substring(0, 10));
  const [salvando, setSalvando] = useState(false);

  // 1. Função para buscar todos os dados no Supabase
  async function carregarDados() {
    setLoading(true);
    try {
      const { data: t } = await supabase.from('transacoes').select('*, categorias(nome), contas(nome)').order('data_transacao', { ascending: false });
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

  useEffect(() => {
    carregarDados();
  }, []);

  // 2. Função para salvar um novo lançamento administrativo
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !valor || !categoriaId || !contaId) {
      return alert('Por favor, preencha todos os campos obrigatórios!');
    }

    setSalvando(true);
    const { error } = await supabase.from('transacoes').insert([{
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria_id: parseInt(categoriaId),
      conta_id: parseInt(contaId),
      forma_pagamento: formaPagamento,
      data_transacao: dataTransacao,
      status: 'CONCRETIZADO'
    }]);

    setSalvando(false);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      alert('Lançamento registrado com sucesso!');
      // Limpa o formulário
      setDescricao('');
      setValor('');
      setCategoriaId('');
      // Atualiza a tela com as novas informações
      carregarDados();
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600 font-semibold">Carregando dados da Paróquia...</div>;
  }

  // ==========================================
  // LÓGICA DO FLUXO DE CAIXA (BASEADO NO PDF)
  // ==========================================
  
  // Saldos finais de Agosto que viram os saldos Iniciais de Setembro
  const saldoInicialCaixa = 3146.95;
  const saldoInicialBanco = 97743.09;
  const saldoInicialTotal = saldoInicialCaixa + saldoInicialBanco;

  // Variáveis para somar o que aconteceu no mês atual
  let totalEntradasCaixa = 0;
  let totalSaidasCaixa = 0;
  let totalEntradasBanco = 0;
  let totalSaidasBanco = 0;

  transacoes.forEach(t => {
    const v = Number(t.valor);
    if (t.tipo === 'ENTRADA') {
      // Se conta_id for 1 vai pro Caixa, se for 2 (ou outro) vai pro Banco
      t.conta_id === 1 ? totalEntradasCaixa += v : totalEntradasBanco += v;
    } else {
      t.conta_id === 1 ? totalSaidasCaixa += v : totalSaidasBanco += v;
    }
  });

  // Cálculos Consolidados Gerais
  const totalGeralEntradas = totalEntradasCaixa + totalEntradasBanco;
  const totalGeralSaidas = totalSaidasCaixa + totalSaidasBanco;
  
  // Saldos Finais Dinâmicos
  const saldoAtualCaixa = saldoInicialCaixa + totalEntradasCaixa - totalSaidasCaixa;
  const saldoAtualBanco = saldoInicialBanco + totalEntradasBanco - totalSaidasBanco;
  const saldoFinalTotal = saldoInicialTotal + totalGeralEntradas - totalGeralSaidas;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* CABEÇALHO */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Paróquia Santo Expedito</h1>
        <p className="text-gray-500 text-sm">Painel de Gestão, Lançamentos e Fluxo de Caixa</p>
      </div>

      {/* PAINEL DE SALDOS (CARDS) */}
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

      {/* RESUMO DE ENTRADAS E SAÍDAS */}
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

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
          <div className="md:col-span-3 lg:col-span-4 flex justify-end pt-2">
            <button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition">
              {salvando ? 'Salvando...' : '✨ Registrar no Fluxo'}
            </button>
          </div>
        </form>
      {/* HISTÓRICO DE LANÇAMENTOS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <h2 className="text-xl font-bold text-gray-700 mb-4">📋 Lançamentos Recentes</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-gray-400 uppercase text-xs">
              <th className="pb-3">Data</th>
              <th className="pb-3">Descrição</th>
              <th className="pb-3">Categoria</th>
              <th className="pb-3">Conta</th>
              <th className="pb-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-600">
            {transacoes.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3">{new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="py-3 font-medium text-gray-800">{t.descricao}</td>
                <td className="py-3">{t.categorias?.nome || 'Sem categoria'}</td>
                <td className="py-3">{t.contas?.nome || 'Sem conta'}</td>
                <td className={`py-3 text-right font-bold ${t.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                </td>
              </tr>
            ))}
            {transacoes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
