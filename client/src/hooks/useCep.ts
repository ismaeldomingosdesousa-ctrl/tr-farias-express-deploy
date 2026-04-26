import { useState, useCallback } from "react";

interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AddressFields {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  fullAddress: string;
}

export function useCep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (rawCep: string): Promise<AddressFields | null> => {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setError("CEP deve ter 8 dígitos");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) throw new Error("Falha na consulta");
      const data: CepData = await res.json();
      if (data.erro) {
        setError("CEP não encontrado");
        return null;
      }
      const street = data.logradouro ?? "";
      const neighborhood = data.bairro ?? "";
      const city = data.localidade ?? "";
      const state = data.uf ?? "";
      const fullAddress = [street, neighborhood, city, state].filter(Boolean).join(", ");
      return { street, neighborhood, city, state, fullAddress };
    } catch {
      setError("Erro ao consultar CEP");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error };
}
