import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { api, USE_LOCAL_API } from "@/lib/api";

function buildEmptyWeek() {
  return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => ({ name: d, xray: 0, ct: 0, mri: 0, us: 0 }));
}

export function ExamChart() {
  const [data, setData] = useState(() => buildEmptyWeek());

  useEffect(() => {
    fetchStats();
  }, []);

  // Listen for exam status updates
  useEffect(() => {
    const handleExamUpdate = () => {
      console.log('Exam status updated, refreshing exam chart');
      fetchStats();
    };

    window.addEventListener('examStatusUpdated', handleExamUpdate);
    
    return () => {
      window.removeEventListener('examStatusUpdated', handleExamUpdate);
    };
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing exam chart');
      fetchStats();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      if (USE_LOCAL_API) {
        const rows = await api.getExamStats();
        console.log('Exam stats from API:', rows);
        // rows: [{ day_of_week, exam_type, count }, ...]
        const map = buildEmptyWeek();
        const dayIndex = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };
        (rows || []).forEach((r: any) => {
          const idx = dayIndex[r.day_of_week] ?? 0;
          const key = (r.exam_type || '').toLowerCase();
          if (key.includes('xray') || key.includes('x-ray')) map[idx].xray += r.count;
          else if (key.includes('ct')) map[idx].ct += r.count;
          else if (key.includes('mri')) map[idx].mri += r.count;
          else map[idx].us += r.count;
        });
        setData(map);
      } else {
        // keep static demo data if not local
      }
    } catch (err) {
      console.error('Failed to fetch exam stats', err);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Weekly Examinations</h2>
        <p className="text-sm text-muted-foreground">Breakdown by examination type</p>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorXray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(168, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(168, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(186, 76%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(186, 76%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMri" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="name" stroke="hsl(215, 15%, 45%)" fontSize={12} />
            <YAxis stroke="hsl(215, 15%, 45%)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area type="monotone" dataKey="xray" stroke="hsl(168, 76%, 36%)" fillOpacity={1} fill="url(#colorXray)" strokeWidth={2} name="X-Ray" />
            <Area type="monotone" dataKey="ct" stroke="hsl(186, 76%, 45%)" fillOpacity={1} fill="url(#colorCt)" strokeWidth={2} name="CT Scan" />
            <Area type="monotone" dataKey="mri" stroke="hsl(199, 89%, 48%)" fillOpacity={1} fill="url(#colorMri)" strokeWidth={2} name="MRI" />
            <Area type="monotone" dataKey="us" stroke="hsl(160, 84%, 39%)" fillOpacity={1} fill="url(#colorUs)" strokeWidth={2} name="Ultrasound" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {[
          { name: "X-Ray", color: "hsl(168, 76%, 36%)" },
          { name: "CT Scan", color: "hsl(186, 76%, 45%)" },
          { name: "MRI", color: "hsl(199, 89%, 48%)" },
          { name: "Ultrasound", color: "hsl(160, 84%, 39%)" },
        ].map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
