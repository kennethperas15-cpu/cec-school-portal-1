import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Props {
  className?: string;
}

export const RevenueDashboard = ({ className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch RevenueDashboard data
    api.get('/revenuedashboard').then((response) => setData(response.data));
  }, []);

  return (
    <div className="cec-card p-6">
      <h2 className="text-[#0B3D91] font-bold">RevenueDashboard</h2>
      {/* Thesis-ready implementation */}
    </div>
  );
};