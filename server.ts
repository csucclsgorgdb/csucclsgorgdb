import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase Admin Client
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // API Routes
  app.post('/api/admin/create-user', async (req, res) => {
    const { email, password, full_name, role, organization_id } = req.body;

    try {
      // 1. Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError) throw authError;

      // 2. Create profile in public.profiles
      // Note: The trigger might already do this, but we want to ensure 
      // the role and organization_id are set correctly.
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          email,
          full_name,
          role,
          organization_id: organization_id || null
        });

      if (profileError) throw profileError;

      res.json({ success: true, user: authUser.user });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
