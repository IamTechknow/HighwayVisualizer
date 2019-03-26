let California = {};
['5', '8', '10', '15', '40', '80', '105', '110', '205', '210', '215', '238', '280', '380', '405',
'505', '580', '605', '680', '710', '780', '805', '880', '980'].forEach(ele => { California[ele] = "Interstate"; });
['6', '50', '95', '97', '101', '199', '395'].forEach(ele => { California[ele] = "US Highway"; });

let District = {};
['66', '95', '295', '395', '495', '695'].forEach(ele => { District[ele] = "Interstate"; });
['1', '29', '50'].forEach(ele => { District[ele] = "US Highway"; });

let Hawaii = {};
['1', '2', '3', '201'].forEach(ele => { Hawaii[ele] = "Interstate"; });

let Maryland = {};
['68', '70', '81', '83', '95', '97', '195', '270', '295', '370', '395', '495', '595', '695', '795', '895'].forEach(ele => { Maryland[ele] = "Interstate"; });
['1', '11', '13', '15', '29', '40', '50', '113', '219', '220', '222', '301', '340', '522'].forEach(ele => { Maryland[ele] = "US Highway"; });

let Nevada = {};
['11', '15', '80', '215', '515', '580'].forEach(ele => { Nevada[ele] = "Interstate"; });
['6', '50', '93', '95', '395'].forEach(ele => { Nevada[ele] = "US Highway"; });

module.exports = {
  California,
  District,
  Hawaii,
  Maryland,
  Nevada
};
