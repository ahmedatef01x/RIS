import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { api, USE_LOCAL_API } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export function BillingChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      if (USE_LOCAL_API) {
        const stats = await api.getBillingLast30DaysStats();
        console.log('Billing last 30 days stats from API:', stats);
        
        if (Array.isArray(stats) && stats.length > 0) {
          const chartData = stats.map(day => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            total: Number(day.total_amount || 0),
            paid: Number(day.paid_amount || 0),
            outstanding: Number(day.pending_amount || 0)
          })).reverse();
          
          setData(chartData);
        }
      } else {
        // Supabase implementation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: billingData, error } = await supabase
          .from('billing')
          .select('created_at, status, total_due_egp')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const groupedData: { [key: string]: any } = {};
        
        if (billingData) {
          billingData.forEach(record => {
            const date = new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (!groupedData[date]) {
              groupedData[date] = {
                date,
                total: 0,
                paid: 0,
                outstanding: 0
              };
            }
            
            const amount = Number(record.total_due_egp || 0);
            groupedData[date].total += amount;
            
            if (record.status === 'paid') {
              groupedData[date].paid += amount;
            } else {
              groupedData[date].outstanding += amount;
            }
          });
        }

        const chartData = Object.values(groupedData);
        setData(chartData);
      }
    } catch (err) {
      console.error('Failed to fetch billing stats', err);
    }
  };

  if (data.length === 0) return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground">Billing & Payments</h2>
      <p className="text-sm text-muted-foreground">Last 30 days</p>
      <div className="text-center py-8 text-muted-foreground">
        No billing data
      </div>
    </div>
  );

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Billing & Payments</h2>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} EGP`} />
            <Area type="monotone" dataKey="total" stroke="#2b8aef" fill="#2b8aef33" name="Total" />
            <Area type="monotone" dataKey="paid" stroke="#16a34a" fill="#16a34a33" name="Paid" />
            <Area type="monotone" dataKey="outstanding" stroke="#ef4444" fill="#ef444433" name="Outstanding" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
