import { Projeto } from '../domain/Projeto';

export interface RegistradorProjeto {
    registrar(projeto: Projeto): Promise<void>;
}