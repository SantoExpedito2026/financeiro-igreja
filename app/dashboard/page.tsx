'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Transacao {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  data: string;
}

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      const { data, error } = await supabase.from('transacoes').select('*');
      if (!error && data) {
        setTransacoes(data);
      }
      setLoading(false);
    }
    buscarDados();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando dados...</div>;

  // Processar dados para o Gráfico de Pizza (Categorias de Receitas)
  const dadosPizza = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc: any[], atual) => {
      const existente = acc.find(item => item.name === atual.categoria);
      if (existente) {
        existente.value += atual.valor;
      } else {
        acc.push({ name: atual.categoria, value: atual.valor });
      }
      return acc;
    }, []);

  // Processar dados para o Gráfico de Linhas (Evolução mensal simplificada por data)
  const dadosLinha = transacoes.reduce((acc: any[], atual) => {
    const dataFormatada = atual.data.substring(0, 7); // Pega 'ANO-MES'
    const existente = acc.find(item => item.mes === dataFormatada);
    
    if (existente) {
      if (atual.tipo === 'receita') existente.receitas += atual.valor;
      if (atual.tipo === 'despesa') existente.despesas += atual.valor;
    } else {
      acc.push({
        mes: dataFormatada,
        receitas: atual.tipo === 'receita' ? atual.valor : 0,
        despesas: atual.tipo === 'despesa' ? atual.valor : 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.mes.localeCompare(b.mes));

  const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Financeiro da Igreja</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gráfico de Composição de Receitas (Pizza) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Composição das Receitas</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="300%">
              <PieChart>
                <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Evolução Mensal (Linhas) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Evolução Mensal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="300%">
              <LineChart data={dadosLinha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="receitas" stroke="#00C49F" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#FF8042" strokeWidth={2} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}