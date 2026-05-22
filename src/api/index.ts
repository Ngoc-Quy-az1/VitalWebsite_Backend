import { Router } from 'express';
import auth from './routes/auth';
import user from './routes/user';
import chat from './routes/chat';
import aiProxy from './routes/aiProxy';
import files from './routes/files';

// guaranteed to get dependencies
export default () => {
	const app = Router();
	auth(app);
	user(app);
	chat(app);
	aiProxy(app);
	files(app);

	return app
}