import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class Bridge {
  @PrimaryColumn({ type: "varchar" })
  key = "";

  @Column({ type: "varchar" })
  name = "";

  @Column({ type: "varchar" })
  host = "";

  @Column({ type: "int" })
  port = 9170;

  @Column({ type: "varchar", nullable: true })
  apiKey = "";
}
