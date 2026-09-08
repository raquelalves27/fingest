import { useEffect, useState } from "react";
import { listAccounts, type Account } from "@/modules/accounts/api";
import { listCategories, type Category } from "@/modules/categories/api";

export function useFormOptions() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [acc, cat] = await Promise.all([listAccounts(), listCategories()]);
      setAccounts(acc);
      setCategories(cat);
      setIsLoading(false);
    }
    load();
  }, []);

  return { accounts, categories, isLoading };
}
