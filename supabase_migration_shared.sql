-- ============================================================
-- Kasička — Migrace: Sdílené výdaje mezi uživateli
-- Spusť tento SQL v Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Profily uživatelů
-- Každý přihlášený uživatel si nastaví jméno a avatar
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '👤',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Každý vidí profily všech (potřeba pro zobrazení jmen ve skupinách)
CREATE POLICY "Profily jsou veřejné pro přihlášené"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Svůj profil může vytvořit/upravit/smazat jen vlastník
CREATE POLICY "Vlastník spravuje svůj profil"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vlastník upravuje svůj profil"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vlastník maže svůj profil"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2) Přátelství (propojení dvou uživatelů)
-- status: 'pending' = čeká na potvrzení, 'accepted' = propojeni
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id <> user2_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Vidím přátelství kde jsem účastníkem
CREATE POLICY "Vidím svá přátelství"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Pozvánku může poslat kdokoli (user1 = odesílatel)
CREATE POLICY "Mohu poslat žádost o přátelství"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id);

-- Aktualizovat může příjemce (potvrzení) nebo kdokoli z dvojice
CREATE POLICY "Účastník může aktualizovat přátelství"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Smazat může kdokoli z dvojice (zrušení přátelství)
CREATE POLICY "Účastník může smazat přátelství"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);


-- 3) Sdílené skupiny (Domácnost, Dovolená atd.)
CREATE TABLE shared_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shared_groups ENABLE ROW LEVEL SECURITY;


-- 4) Členové skupin
CREATE TABLE shared_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE shared_group_members ENABLE ROW LEVEL SECURITY;

-- Skupinu vidím pokud jsem členem
CREATE POLICY "Člen vidí svou skupinu"
  ON shared_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_group_members
      WHERE shared_group_members.group_id = shared_groups.id
        AND shared_group_members.user_id = auth.uid()
    )
  );

-- Skupinu může vytvořit kdokoli
CREATE POLICY "Přihlášený může vytvořit skupinu"
  ON shared_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Upravit může tvůrce
CREATE POLICY "Tvůrce upravuje skupinu"
  ON shared_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Smazat může tvůrce
CREATE POLICY "Tvůrce maže skupinu"
  ON shared_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Členy vidím pokud jsem ve stejné skupině
CREATE POLICY "Člen vidí členy své skupiny"
  ON shared_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_group_members AS my
      WHERE my.group_id = shared_group_members.group_id
        AND my.user_id = auth.uid()
    )
  );

-- Přidat člena může tvůrce skupiny
CREATE POLICY "Tvůrce přidává členy"
  ON shared_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_groups
      WHERE shared_groups.id = group_id
        AND shared_groups.created_by = auth.uid()
    )
    -- Nebo přidávám sám sebe (při vytváření skupiny)
    OR auth.uid() = user_id
  );

-- Odejít může člen sám, nebo tvůrce může odebrat
CREATE POLICY "Člen odchází nebo tvůrce odebírá"
  ON shared_group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM shared_groups
      WHERE shared_groups.id = group_id
        AND shared_groups.created_by = auth.uid()
    )
  );


-- 5) Sdílené transakce
CREATE TABLE shared_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CZK',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shared_transactions ENABLE ROW LEVEL SECURITY;

-- Vidím transakce ze skupin kde jsem členem
CREATE POLICY "Člen vidí transakce své skupiny"
  ON shared_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_group_members
      WHERE shared_group_members.group_id = shared_transactions.group_id
        AND shared_group_members.user_id = auth.uid()
    )
  );

-- Transakci přidá člen skupiny (sám za sebe)
CREATE POLICY "Člen přidává transakce"
  ON shared_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM shared_group_members
      WHERE shared_group_members.group_id = group_id
        AND shared_group_members.user_id = auth.uid()
    )
  );

-- Upravit může jen autor transakce
CREATE POLICY "Autor upravuje svou transakci"
  ON shared_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Smazat může autor nebo tvůrce skupiny
CREATE POLICY "Autor nebo tvůrce maže transakci"
  ON shared_transactions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM shared_groups
      WHERE shared_groups.id = group_id
        AND shared_groups.created_by = auth.uid()
    )
  );


-- 6) Indexy pro výkon
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX idx_shared_group_members_group ON shared_group_members(group_id);
CREATE INDEX idx_shared_group_members_user ON shared_group_members(user_id);
CREATE INDEX idx_shared_transactions_group ON shared_transactions(group_id);
CREATE INDEX idx_shared_transactions_user ON shared_transactions(user_id);
CREATE INDEX idx_shared_transactions_date ON shared_transactions(date);


-- 7) Realtime — zapni pro live aktualizace (volitelné)
-- Odkomentuj pokud chceš aby se změny propsaly v reálném čase:
-- ALTER PUBLICATION supabase_realtime ADD TABLE shared_transactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE shared_group_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
