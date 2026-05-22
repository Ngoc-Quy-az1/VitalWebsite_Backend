export interface IUser {
  id?: string;
  username: string;
  email: string;
  password_hash?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IUserInputDTO {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}
