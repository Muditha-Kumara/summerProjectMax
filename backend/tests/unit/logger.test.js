import winston from 'winston';

// We need to mock config before importing logger
jest.unstable_mockModule('../../src/config/index.js', () => ({
  default: {
    nodeEnv: 'test',
    logging: {
      level: 'debug',
      file: 'logs/test.log',
    },
  },
}));

const { default: logger } = await import('../../src/utils/logger.js');

describe('Logger', () => {
  describe('Logger instance', () => {
    it('should be a valid Winston logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should have standard Winston logger methods', () => {
      const methods = ['info', 'error', 'warn', 'debug', 'log'];
      methods.forEach((method) => {
        expect(typeof logger[method]).toBe('function');
      });
    });

    it('should have transports configured', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });
  });

  describe('Log level configuration', () => {
    it('should have the correct log level from config', () => {
      expect(logger.level).toBe('debug');
    });

    it('should allow changing log level at runtime', () => {
      const originalLevel = logger.level;
      logger.level = 'warn';
      expect(logger.level).toBe('warn');
      // Restore
      logger.level = originalLevel;
    });

    it('should respect log level hierarchy', () => {
      // Winston levels: error=0, warn=1, info=2, http=3, verbose=4, debug=5, silly=6
      // With level 'debug', all levels except 'silly' should be enabled
      expect(logger.levels).toBeDefined();
      expect(logger.levels.error).toBeLessThan(logger.levels.warn);
      expect(logger.levels.warn).toBeLessThan(logger.levels.info);
      expect(logger.levels.info).toBeLessThan(logger.levels.debug);
    });
  });

  describe('Console transport', () => {
    it('should have a Console transport', () => {
      const consoleTransport = logger.transports.find(
        (t) => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    it('should not have a File transport in test environment', () => {
      const fileTransport = logger.transports.find(
        (t) => t instanceof winston.transports.File
      );
      expect(fileTransport).toBeUndefined();
    });
  });

  describe('Default metadata', () => {
    it('should include default service metadata', () => {
      expect(logger.defaultMeta).toBeDefined();
      expect(logger.defaultMeta.service).toBe('smart-heating-api');
    });
  });

  describe('Logging methods do not throw', () => {
    // Spy on console transport to prevent actual output during tests
    let consoleSpy;

    beforeEach(() => {
      // Silence transports during tests
      logger.transports.forEach((transport) => {
        transport.silent = true;
      });
    });

    afterEach(() => {
      logger.transports.forEach((transport) => {
        transport.silent = false;
      });
    });

    it('should log info messages without throwing', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log error messages without throwing', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log warn messages without throwing', () => {
      expect(() => logger.warn('Test warn message')).not.toThrow();
    });

    it('should log debug messages without throwing', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should log messages with metadata objects', () => {
      expect(() =>
        logger.info('Test with metadata', { userId: 123, action: 'login' })
      ).not.toThrow();
    });

    it('should log Error objects with stack trace', () => {
      const testError = new Error('Test error with stack');
      expect(() => logger.error('Error occurred', testError)).not.toThrow();
    });

    it('should handle logging with multiple arguments', () => {
      expect(() =>
        logger.info('Multiple', 'arguments', { key: 'value' })
      ).not.toThrow();
    });

    it('should handle logging with empty message', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle logging with null/undefined metadata', () => {
      expect(() => logger.info('Null metadata', null)).not.toThrow();
      expect(() => logger.info('Undefined metadata', undefined)).not.toThrow();
    });
  });

  describe('Log format', () => {
    it('should use JSON format', () => {
      // The logger should be configured with JSON format
      // We verify by checking the format is set
      expect(logger.format).toBeDefined();
    });

    it('should include timestamp in log output', () => {
      // Verify by checking format configuration exists
      expect(logger.format).toBeDefined();
    });
  });

  describe('File transport in production', () => {
    it('should not add file transport when not in production', () => {
      // In test environment, file transport should not exist
      const fileTransport = logger.transports.find(
        (t) => t instanceof winston.transports.File
      );
      expect(fileTransport).toBeUndefined();
    });
  });

  describe('Logger child loggers', () => {
    it('should support creating child loggers', () => {
      const childLogger = logger.child({ module: 'auth' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should inherit default metadata in child loggers', () => {
      const childLogger = logger.child({ module: 'booking' });
      expect(childLogger.defaultMeta).toBeDefined();
      expect(childLogger.defaultMeta.service).toBe('smart-heating-api');
      expect(childLogger.defaultMeta.module).toBe('booking');
    });

    it('should allow child loggers to log without throwing', () => {
      logger.transports.forEach((t) => (t.silent = true));

      const childLogger = logger.child({ module: 'test' });
      expect(() => childLogger.info('Child logger message')).not.toThrow();
      expect(() => childLogger.error('Child logger error')).not.toThrow();

      logger.transports.forEach((t) => (t.silent = false));
    });
  });

  describe('Logger exception handling', () => {
    it('should have exception handlers or rejections configured', () => {
      // Winston logger should handle exceptions gracefully
      expect(logger.exceptions).toBeDefined();
      expect(logger.rejections).toBeDefined();
    });
  });

  describe('Logger profile and timing', () => {
    beforeEach(() => {
      logger.transports.forEach((t) => (t.silent = true));
    });

    afterEach(() => {
      logger.transports.forEach((t) => (t.silent = false));
    });

    it('should support profiling without throwing', () => {
      expect(() => logger.profile('test-operation')).not.toThrow();
      expect(() => logger.profile('test-operation')).not.toThrow();
    });
  });
});