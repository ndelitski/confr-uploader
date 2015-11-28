const {Descriptor} = require('../src/descriptor');

describe('descriptor', function() {
    it('should correctly extract version and env from fileName', async function() {
        expect(Descriptor.parseFileName('config#intl@production.json')).to.eql({version: 'intl', environment: 'production'});
        expect(Descriptor.parseFileName('config#intl.json')).to.eql({version: 'intl', environment: null});
        expect(Descriptor.parseFileName('config@production.json')).to.eql({version: null, environment: 'production'});
        expect(Descriptor.parseFileName('config.json')).to.eql({version: null, environment: null});
        expect(Descriptor.parseFileName('config@production.ext1.ext2.json')).to.eql({version: null, environment: 'production.ext1.ext2'});
    });
  it('should correctly clean version and env from fileName', async function() {
    expect(Descriptor.cleanFileName('config#intl@production.json')).to.eql('config.json');
    expect(Descriptor.cleanFileName('config#intl.json')).to.eql('config.json');
    expect(Descriptor.cleanFileName('config@production.json')).to.eql('config.json');
    expect(Descriptor.cleanFileName('config.json')).to.eql('config.json');
    expect(Descriptor.cleanFileName('config@production.ext1.ext2.json')).to.eql('config.json');
  });
});
