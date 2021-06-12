import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class Setting {
  @PrimaryColumn()
  key?: string;

  @Column()
  value?: string;
}
