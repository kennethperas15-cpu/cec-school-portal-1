import { useEffect, useState } from 'react';
import api from './api';

export type AcademicConfig = { schoolYear: string; semester: string };

export const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  schoolYear: '2026–2027',
  semester: '1st Semester',
};

export const useAcademicConfig = () => {
  const [config, setConfig] = useState<AcademicConfig>(DEFAULT_ACADEMIC_CONFIG);

  useEffect(() => {
    let active = true;
    api.get<{ data: AcademicConfig }>('/portal/config/academic')
      .then((response) => {
        if (active && response.data.data?.schoolYear && response.data.data?.semester) setConfig(response.data.data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return config;
};
