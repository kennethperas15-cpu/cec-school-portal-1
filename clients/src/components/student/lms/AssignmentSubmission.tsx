import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Props {
  className?: string;
}

export const AssignmentSubmission = ({ className }: Props) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch AssignmentSubmission data
    api.get('/assignmentsubmission').then((response) => setData(response.data));
  }, []);

  return (
    <div className="cec-card p-6">
      <h2 className="text-[#0B3D91] font-bold">AssignmentSubmission</h2>
      {/* Thesis-ready implementation */}
    </div>
  );
};