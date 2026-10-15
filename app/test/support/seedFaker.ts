// Same seed before every test: random-looking data, but identical on every run,
// so a test that fails because of its data fails again when you rerun it.
import { faker, fakerTH } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(20261003);
  fakerTH.seed(20261003);
});
