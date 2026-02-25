// config.js
const CONFIG = {
    API_BASE: 'https://api.agtechscript.in',
    SHEETS_API: 'https://script.google.com/macros/s/AKfycbx9eWUVyEz-a_zmJKIC9zqu_qQ9AmJom_d9X2mz1_o2Ujt177P4V_ImRhoQpNPXbs2omw/exec',
    SUBDOMAINS: {
        'founder': '0.agtechscript.in',
        'admin': 'admin.agtechscript.in',
        'manager': 'manager.agtechscript.in',
        'partner': 'partner.agtechscript.in',
        'staff': 'member.agtechscript.in',
        'user': 'account.agtechscript.in'
    },
    SESSION_TIMEOUT: 3600000, // 1 hour
    VERSION: '1.0.0'
};

// Prevent console tampering
Object.freeze(CONFIG);