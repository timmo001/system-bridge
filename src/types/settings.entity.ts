import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class Setting {
  @PrimaryColumn({ type: "varchar" })
  key = "";

  @Column({ type: "varchar" })
  value = "";
}
