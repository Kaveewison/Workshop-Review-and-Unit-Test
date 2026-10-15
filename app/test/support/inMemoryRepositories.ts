// Fake repositories: ทำงานเหมือน Pg* จริง แต่เก็บข้อมูลใน array แทน PostgreSQL (ไม่มี I/O)
// ต้องเลียนแบบพฤติกรรมของ SQL จริงให้ตรง เช่น ORDER BY และการ JOIN เอา partyName มาด้วย
import { Candidate, District, Party } from '../../src/domain/types';
import { CandidateRepository, NewCandidate } from '../../src/repositories/candidateRepository';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { NewParty, PartyRepository } from '../../src/repositories/partyRepository';

export class InMemoryDistrictRepository implements DistrictRepository {
  constructor(private readonly districts: District[] = []) {}

  async findAll() {
    // เหมือน ORDER BY province, number
    return [...this.districts].sort((a, b) => a.province.localeCompare(b.province) || a.number - b.number);
  }

  async findById(id: string) {
    return this.districts.find((district) => district.id === id) ?? null;
  }
}

export class InMemoryPartyRepository implements PartyRepository {
  private readonly parties: Party[] = [];
  private nextId = 1;

  async findAll() {
    // เหมือน ORDER BY name
    return [...this.parties].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: number) {
    return this.parties.find((party) => party.id === id) ?? null;
  }

  async findByName(name: string) {
    return this.parties.find((party) => party.name === name) ?? null;
  }

  async create(party: NewParty) {
    const created: Party = { id: this.nextId++, ...party };
    this.parties.push(created);
    return created;
  }
}

export class InMemoryCandidateRepository implements CandidateRepository {
  private readonly candidates: Candidate[] = [];
  private nextId = 1;

  // ของจริง JOIN ตาราง parties เพื่อเอา partyName — fake จึงต้องรู้จัก party repository ด้วย
  constructor(private readonly parties: PartyRepository) {}

  async findByDistrict(districtId: string) {
    // เหมือน WHERE c.district_id = $1 ORDER BY c.number
    return this.candidates.filter((c) => c.districtId === districtId).sort((a, b) => a.number - b.number);
  }

  async findByParty(partyId: number) {
    // เหมือน WHERE c.party_id = $1 ORDER BY c.district_id, c.number
    return this.candidates
      .filter((c) => c.partyId === partyId)
      .sort((a, b) => a.districtId.localeCompare(b.districtId) || a.number - b.number);
  }

  async create(candidate: NewCandidate) {
    const party = await this.parties.findById(candidate.partyId);
    const created: Candidate = { id: this.nextId++, partyName: party?.name ?? '', ...candidate };
    this.candidates.push(created);
    return created;
  }
}
