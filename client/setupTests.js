import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

configure({ adapter: new Adapter() });

const divCallback = () => (<div></div>);

// Mock react-feather icons. Creating mock file doesn't appear to work
jest.mock("../node_modules/react-feather/dist/icons/info", () => {
  return {
    __esModule: true,
    default: divCallback,
  };
});
jest.mock("../node_modules/react-feather/dist/icons/map", () => {
  return {
    __esModule: true,
    default: divCallback,
  };
});
jest.mock("../node_modules/react-feather/dist/icons/search", () => {
  return {
    __esModule: true,
    default: divCallback,
  };
});
jest.mock("../node_modules/react-feather/dist/icons/user", () => {
  return {
    __esModule: true,
    default: divCallback,
  };
});
jest.mock("../node_modules/react-feather/dist/icons/arrow-left", () => {
  return {
    __esModule: true,
    default: divCallback,
  };
});
