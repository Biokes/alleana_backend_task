import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from '../utils/types';

export enum CallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  FAILED = 'FAILED'
}

export enum CallEventType {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ENDED = 'ENDED',
  HEARTBEAT = 'HEARTBEAT'
}

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value !== null && value !== undefined ? Number(value) : 0)
};

@Entity()
@Index(["email"]) 
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: false })
  email!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: false })
  password!: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: string;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet?: Wallet;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

@Entity()
@Index(["userId"], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false, unique: true })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0, transformer: numericTransformer })
  balance!: number;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}

@Entity()
@Index(["reference"], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  walletId!: number;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 128 })
  reference!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}




@Entity()
export class CallSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  callerId!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'callerId' })
  caller!: User;

  @Column({ type: 'int', nullable: false })
  calleeId!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'calleeId' })
  callee!: User;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.INITIATED })
  status!: CallStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSec!: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: numericTransformer })
  cost!: number | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}

@Entity()
export class CallEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  sessionId!: number;

  @ManyToOne(() => CallSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: CallSession;

  @Column({ type: 'enum', enum: CallEventType })
  type!: CallEventType;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;
}

export default {};
