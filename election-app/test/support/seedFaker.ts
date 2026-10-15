// Same seed before every test: the data looks random but is identical on every run,
// so a test that fails because of its data fails again when you rerun it.
import { faker, fakerTH } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(20261019);
  fakerTH.seed(20261019);
});
