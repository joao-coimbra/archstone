import type { Creatable } from "./creatable.ts"
import type { Deletable } from "./deletable.ts"
import type { Findable } from "./findabe.ts"
import type { Saveable } from "./saveble.ts"

/**
 * Full CRUD repository contract, composing all segregated interfaces.
 *
 * Use this when the repository needs to support all operations. For more
 * constrained repositories, prefer composing only the interfaces you need.
 *
 * @template T - The entity type
 *
 * @example
 * ```ts
 * // full CRUD
 * export interface UserRepository extends Repository<User> {
 *   findByEmail(email: string): Promise<User | null>
 * }
 *
 * // read-only
 * export interface ReportRepository extends Findable<Report> {
 *   findByPeriod(start: Date, end: Date): Promise<Report[]>
 * }
 *
 * // append-only
 * export interface AuditRepository extends Creatable<AuditLog> {}
 * ```
 */
export interface Repository<T>
  extends Findable<T>,
    Saveable<T>,
    Creatable<T>,
    Deletable<T> {}
