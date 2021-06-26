export interface CreateCommandDto {
  command: string;
  arguments: string[];
  wait?: boolean;
  success?: boolean;
  message?: string;
  error?: string;
}
