/* global Word */
import juice from 'juice';
import { getSettings } from '../types/settings';
import { getFontSizeValue } from '../types/wordFonts';


// TeX 到 Unicode 符号映射
const TEX_SYMBOLS: Record<string, string> = {
    // 希腊字母（小写）
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
    'varepsilon': 'ɛ', 'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'vartheta': 'ϑ',
    'iota': 'ι', 'kappa': 'κ', 'lambda': 'λ', 'mu': 'μ', 'nu': 'ν',
    'xi': 'ξ', 'pi': 'π', 'varpi': 'ϖ', 'rho': 'ρ', 'varrho': 'ϱ',
    'sigma': 'σ', 'varsigma': 'ς', 'tau': 'τ', 'upsilon': 'υ', 'phi': 'φ',
    'varphi': 'ϕ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
    // 希腊字母（大写）
    'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Xi': 'Ξ',
    'Pi': 'Π', 'Sigma': 'Σ', 'Upsilon': 'Υ', 'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω',
    // 二元运算符
    'times': '×', 'div': '÷', 'pm': '±', 'mp': '∓', 'cdot': '·',
    'ast': '∗', 'star': '⋆', 'circ': '∘', 'bullet': '•',
    'oplus': '⊕', 'ominus': '⊖', 'otimes': '⊗', 'oslash': '⊘', 'odot': '⊙',
    // 关系运算符
    'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥', 'neq': '≠', 'ne': '≠',
    'approx': '≈', 'equiv': '≡', 'sim': '∼', 'simeq': '≃', 'cong': '≅',
    'propto': '∝', 'prec': '≺', 'succ': '≻', 'preceq': '⪯', 'succeq': '⪰',
    'll': '≪', 'gg': '≫', 'perp': '⊥', 'parallel': '∥',
    // 集合符号
    'subset': '⊂', 'supset': '⊃', 'subseteq': '⊆', 'supseteq': '⊇',
    'in': '∈', 'ni': '∋', 'notin': '∉', 'cup': '∪', 'cap': '∩',
    'emptyset': '∅', 'varnothing': '∅',
    // 箭头
    'to': '→', 'rightarrow': '→', 'leftarrow': '←', 'uparrow': '↑', 'downarrow': '↓',
    'Rightarrow': '⇒', 'Leftarrow': '⇐', 'Uparrow': '⇑', 'Downarrow': '⇓',
    'leftrightarrow': '↔', 'Leftrightarrow': '⇔', 'updownarrow': '↕',
    'mapsto': '↦', 'longrightarrow': '⟶', 'longleftarrow': '⟵',
    'hookrightarrow': '↪', 'hookleftarrow': '↩',
    // 大型运算符
    'sum': '∑', 'prod': '∏', 'coprod': '∐', 'int': '∫', 'oint': '∮',
    'iint': '∬', 'iiint': '∭', 'bigcup': '⋃', 'bigcap': '⋂',
    'bigoplus': '⨁', 'bigotimes': '⨂', 'bigodot': '⨀',
    // 杂项符号
    'infty': '∞', 'partial': '∂', 'nabla': '∇', 'angle': '∠', 'triangle': '△',
    'sqrt': '√', 'cbrt': '∛', 'surd': '√',
    'forall': '∀', 'exists': '∃', 'nexists': '∄', 'neg': '¬', 'lnot': '¬',
    'land': '∧', 'lor': '∨', 'wedge': '∧', 'vee': '∨',
    'ldots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱',
    'prime': '′', 'dprime': '″', 'degree': '°',
    'Re': 'ℜ', 'Im': 'ℑ', 'hbar': 'ℏ', 'ell': 'ℓ',
    'aleph': 'ℵ', 'wp': '℘',
    // 括号
    'langle': '⟨', 'rangle': '⟩', 'lceil': '⌈', 'rceil': '⌉',
    'lfloor': '⌊', 'rfloor': '⌋', 'lbrace': '{', 'rbrace': '}',
    'lVert': '‖', 'rVert': '‖', 'Vert': '‖', 'vert': '|', 'lvert': '|', 'rvert': '|',
    // 其他
    'therefore': '∴', 'because': '∵',
    'quad': ' ', 'qquad': '  ', 'text': '',
};

// 上标映射（扩展版）
const SUPERSCRIPT: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
    'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
    'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
    't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    'T': 'ᵀ',
};

// 下标映射（扩展版）
const SUBSCRIPT: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
    'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
    's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

/**
 * 将 LaTeX 公式转换为 Unicode 文本
 */
export function texToUnicode(tex: string): string {
    let result = tex.trim();

    // 替换 \text{...} -> 原文
    result = result.replace(/\\text\{([^}]*)\}/g, '$1');
    result = result.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    result = result.replace(/\\mathbf\{([^}]*)\}/g, '$1');

    // 处理数学函数名（保留原名）
    const mathFuncs = ['lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf',
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
        'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'det', 'dim', 'ker',
        'hom', 'arg', 'deg', 'gcd', 'lcm', 'Pr', 'mod'];
    for (const fn of mathFuncs) {
        result = result.replace(new RegExp(`\\\\${fn}(?![a-zA-Z])`, 'g'), fn);
    }

    // 替换符号命令
    for (const [cmd, symbol] of Object.entries(TEX_SYMBOLS)) {
        result = result.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), symbol);
    }

    // 处理 operatorname
    result = result.replace(/\\operatorname\{([^}]*)\}/g, '$1');

    // 处理分数 \frac{a}{b} -> (a)/(b) 或使用分数线
    result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_, num, den) => {
        // 简单分数使用分数线符号
        if (num.length === 1 && den.length === 1 && /\d/.test(num) && /\d/.test(den)) {
            const fractions: Record<string, string> = {
                '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾',
                '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
                '1/6': '⅙', '5/6': '⅚', '1/7': '⅐', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
                '1/9': '⅑', '1/10': '⅒',
            };
            const key = `${num}/${den}`;
            if (fractions[key]) return fractions[key];
        }
        return `(${num})/(${den})`;
    });

    // 处理 aligned/align/equation 等环境（多行公式）
    result = result.replace(/\\begin\{(aligned|align\*?|equation\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g, (_, _type, content) => {
        // 按 \\ 分割行
        const rows = content.split('\\\\').map((r: string) => r.trim()).filter((r: string) => r);
        const formattedRows = rows.map((row: string) => {
            // 移除对齐符号 &，用空格替代
            return row.replace(/&/g, ' ').trim();
        });
        // 多行公式用换行符连接
        return formattedRows.join('\n');
    });

    // 处理矩阵 \begin{bmatrix}...\end{bmatrix}
    result = result.replace(/\\begin\{([bp]?matrix|[BbVv]matrix)\}([\s\S]*?)\\end\{\1\}/g, (_, type, content) => {
        const leftBracket = type === 'pmatrix' ? '(' : type === 'bmatrix' ? '[' : type === 'Bmatrix' ? '{' : type === 'vmatrix' ? '|' : type === 'Vmatrix' ? '‖' : '';
        const rightBracket = type === 'pmatrix' ? ')' : type === 'bmatrix' ? ']' : type === 'Bmatrix' ? '}' : type === 'vmatrix' ? '|' : type === 'Vmatrix' ? '‖' : '';

        const rows = content.split('\\\\').map((r: string) => r.trim()).filter((r: string) => r);
        const formattedRows = rows.map((row: string) => {
            const cells = row.split('&').map((c: string) => c.trim());
            return cells.join('  ');
        });

        return `${leftBracket}${formattedRows.join('; ')}${rightBracket}`;
    });

    // 处理 cases
    result = result.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, content) => {
        const rows = content.split('\\\\').map((r: string) => r.trim()).filter((r: string) => r);
        const formattedRows = rows.map((row: string) => {
            return row.replace(/&/g, ', ');
        });
        return `{${formattedRows.join('; ')}}`;
    });

    // 处理根号 \sqrt{x} -> √(x)
    result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]*)\}/g, (_, n, content) => {
        if (n === '3') return `∛(${content})`;
        if (n === '4') return `∜(${content})`;
        return `${n}√(${content})`;
    });
    result = result.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
    result = result.replace(/\\sqrt\s*(\w)/g, '√$1');

    // 处理上标 ^{abc} 或 ^a
    // 使用括号形式显示无法转换为上标的内容
    result = result.replace(/\^{([^}]*)}/g, (_, content) => {
        // 先递归处理内部的符号
        let processedContent = content;
        for (const [cmd, symbol] of Object.entries(TEX_SYMBOLS)) {
            processedContent = processedContent.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), symbol);
        }
        // 尝试将每个字符转换为上标
        const chars = processedContent.split('');
        const converted: string[] = [];
        let allConverted = true;
        for (const c of chars) {
            if (SUPERSCRIPT[c]) {
                converted.push(SUPERSCRIPT[c]);
            } else if (c === ' ' || c === ',') {
                // 空格和逗号保持原样
                converted.push(c);
            } else {
                allConverted = false;
                break;
            }
        }
        if (allConverted && converted.length > 0) {
            return converted.join('');
        }
        // 如果内容已经有括号，不再添加
        if (processedContent.startsWith('(') && processedContent.endsWith(')')) {
            return `^${processedContent}`;
        }
        return `^(${processedContent})`;
    });
    result = result.replace(/\^(\w)/g, (_, c) => SUPERSCRIPT[c] || `^${c}`);
    // 处理 ^符号 形式（如 ^∞）
    result = result.replace(/\^([^\s\w{])/g, (_, c) => `^(${c})`);

    // 处理下标 _{abc} 或 _a
    result = result.replace(/_{([^}]*)}/g, (_, content) => {
        let processedContent = content;
        for (const [cmd, symbol] of Object.entries(TEX_SYMBOLS)) {
            processedContent = processedContent.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), symbol);
        }
        // 尝试将每个字符转换为下标
        const chars = processedContent.split('');
        const converted: string[] = [];
        let allConverted = true;
        for (const c of chars) {
            if (SUBSCRIPT[c]) {
                converted.push(SUBSCRIPT[c]);
            } else if (c === ' ' || c === ',') {
                // 空格和逗号保持原样（下标中允许）
                converted.push(c);
            } else {
                allConverted = false;
                break;
            }
        }
        if (allConverted && converted.length > 0) {
            return converted.join('');
        }
        // 如果内容已经有括号，不再添加
        if (processedContent.startsWith('(') && processedContent.endsWith(')')) {
            return `_${processedContent}`;
        }
        return `_(${processedContent})`;
    });
    result = result.replace(/_(\w)/g, (_, c) => SUBSCRIPT[c] || `_${c}`);

    // 移除剩余的 LaTeX 命令标记
    result = result.replace(/\\[a-zA-Z]+/g, '');
    result = result.replace(/[{}]/g, '');

    return result;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * LaTeX 到 OMML 转换器
 * 生成 Word 原生公式格式
 */
class LatexToOmml {
    private pos = 0;
    private tex = '';

    convert(tex: string): string {
        this.tex = tex.trim();
        this.pos = 0;
        const content = this.parseExpression();
        return content;
    }

    private parseExpression(): string {
        let result = '';

        while (this.pos < this.tex.length) {
            const ch = this.tex[this.pos];

            if (ch === '{') {
                this.pos++;
                result += this.parseExpression();
            } else if (ch === '}') {
                this.pos++;
                break;
            } else if (ch === '^') {
                // 上标 - 需要回溯获取 base
                result = this.handleSuperscript(result);
            } else if (ch === '_') {
                // 下标 - 需要回溯获取 base
                result = this.handleSubscript(result);
            } else if (ch === '\\') {
                result += this.parseCommand();
            } else if (ch === ' ' || ch === '\n' || ch === '\t') {
                this.pos++;
            } else if (ch === ',') {
                result += `<m:r><m:t>,</m:t></m:r>`;
                this.pos++;
            } else if (ch === '(' || ch === ')' || ch === '[' || ch === ']') {
                result += `<m:r><m:t>${ch}</m:t></m:r>`;
                this.pos++;
            } else if (ch === '+' || ch === '-' || ch === '=' || ch === '<' || ch === '>' || ch === '*' || ch === '/' || ch === '!' || ch === ':' || ch === ';' || ch === '|') {
                result += `<m:r><m:t>${ch}</m:t></m:r>`;
                this.pos++;
            } else {
                // 普通字符
                result += `<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${escapeXml(ch)}</m:t></m:r>`;
                this.pos++;
            }
        }

        return result;
    }

    private parseCommand(): string {
        this.pos++; // skip \
        let cmd = '';
        while (this.pos < this.tex.length && /[a-zA-Z]/.test(this.tex[this.pos])) {
            cmd += this.tex[this.pos];
            this.pos++;
        }

        // 处理特殊命令
        switch (cmd) {
            case 'frac':
                return this.parseFraction();
            case 'sqrt':
                return this.parseSqrt();
            case 'sum':
                return this.parseBigOperator('∑');
            case 'prod':
                return this.parseBigOperator('∏');
            case 'int':
                return this.parseBigOperator('∫');
            case 'lim':
            case 'limsup':
            case 'liminf':
            case 'max':
            case 'min':
            case 'sup':
            case 'inf':
                return this.parseLimitOperator(cmd);
            case 'lVert':
            case 'rVert':
            case 'Vert':
                return `<m:r><m:t>‖</m:t></m:r>`;
            case 'lvert':
            case 'rvert':
            case 'vert':
                return `<m:r><m:t>|</m:t></m:r>`;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'cot':
            case 'sec':
            case 'csc':
            case 'arcsin':
            case 'arccos':
            case 'arctan':
            case 'sinh':
            case 'cosh':
            case 'tanh':
            case 'log':
            case 'ln':
            case 'lg':
            case 'exp':
            case 'det':
            case 'dim':
            case 'ker':
            case 'hom':
            case 'arg':
            case 'deg':
            case 'gcd':
            case 'lcm':
            case 'Pr':
                return this.parseFunc(cmd);
            case 'left':
                return this.parseDelimiter('left');
            case 'right':
                return this.parseDelimiter('right');
            case 'text':
            case 'mathrm':
            case 'mathbf':
                return this.parseTextCommand();
            case 'mathcal':
                return this.parseMathStyle('script');
            case 'mathbb':
                return this.parseMathStyle('double-struck');
            case 'mathfrak':
                return this.parseMathStyle('fraktur');
            case 'tilde':
            case 'widetilde':
                return this.parseAccent('\u0303');  // combining tilde
            case 'hat':
            case 'widehat':
                return this.parseAccent('\u0302');  // combining circumflex
            case 'bar':
            case 'overline':
                return this.parseAccent('\u0304');  // combining macron
            case 'vec':
            case 'overrightarrow':
                return this.parseAccent('\u20d7');  // combining right arrow above
            case 'dot':
                return this.parseAccent('\u0307');  // combining dot above
            case 'ddot':
                return this.parseAccent('\u0308');  // combining diaeresis
            case 'acute':
                return this.parseAccent('\u0301');  // combining acute
            case 'grave':
                return this.parseAccent('\u0300');  // combining grave
            case 'breve':
                return this.parseAccent('\u0306');  // combining breve
            case 'check':
                return this.parseAccent('\u030c');  // combining caron
            case 'begin':
                return this.parseEnvironment();
            case 'end':
                // end 应该在 parseEnvironment 中处理，这里跳过
                this.skipGroup();
                return '';
            case 'operatorname':
                return this.parseOperatorName();
            default:
                // 查找符号
                const symbol = TEX_SYMBOLS[cmd];
                if (symbol) {
                    return `<m:r><m:t>${escapeXml(symbol)}</m:t></m:r>`;
                }
                return `<m:r><m:t>${escapeXml(cmd)}</m:t></m:r>`;
        }
    }

    private parseFraction(): string {
        const num = this.parseGroup();
        const den = this.parseGroup();
        return `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${num}</m:num><m:den>${den}</m:den></m:f>`;
    }

    private parseSqrt(): string {
        // 检查是否有 n 次根
        if (this.tex[this.pos] === '[') {
            this.pos++; // skip [
            let degree = '';
            while (this.pos < this.tex.length && this.tex[this.pos] !== ']') {
                degree += this.tex[this.pos];
                this.pos++;
            }
            this.pos++; // skip ]
            const content = this.parseGroup();
            return `<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg><m:r><m:t>${degree}</m:t></m:r></m:deg><m:e>${content}</m:e></m:rad>`;
        }
        const content = this.parseGroup();
        return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${content}</m:e></m:rad>`;
    }

    private parseBigOperator(symbol: string): string {
        // 检查是否有下标和上标
        let sub = '';
        let sup = '';

        // 跳过空格
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        // 检查下标 _
        if (this.pos < this.tex.length && this.tex[this.pos] === '_') {
            this.pos++;
            sub = this.parseGroup();
        }

        // 跳过空格
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        // 检查上标 ^
        if (this.pos < this.tex.length && this.tex[this.pos] === '^') {
            this.pos++;
            sup = this.parseGroup();
        }

        // 如果没有上下标，直接返回符号
        if (!sub && !sup) {
            return `<m:r><m:t>${symbol}</m:t></m:r>`;
        }

        // 使用 sSubSup 或 sSub/sSup 结构来表示带上下标的运算符（避免空占位符）
        if (sub && sup) {
            return `<m:sSubSup><m:e><m:r><m:t>${symbol}</m:t></m:r></m:e><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup></m:sSubSup>`;
        } else if (sub) {
            return `<m:sSub><m:e><m:r><m:t>${symbol}</m:t></m:r></m:e><m:sub>${sub}</m:sub></m:sSub>`;
        } else {
            return `<m:sSup><m:e><m:r><m:t>${symbol}</m:t></m:r></m:e><m:sup>${sup}</m:sup></m:sSup>`;
        }
    }

    private parseFunc(name: string): string {
        // 直接输出函数名，不使用 m:func 结构（避免空占位符）
        return `<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${name}</m:t></m:r>`;
    }

    private parseLimitOperator(name: string): string {
        // lim, max, min 等可以带下标的运算符
        let sub = '';

        // 跳过空格
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        // 检查下标 _
        if (this.pos < this.tex.length && this.tex[this.pos] === '_') {
            this.pos++;
            sub = this.parseGroup();
        }

        const funcName = `<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${name}</m:t></m:r>`;

        if (sub) {
            // 使用 limLow 直接显示下标在正下方，不用 m:func 避免空占位符
            return `<m:limLow><m:e>${funcName}</m:e><m:lim>${sub}</m:lim></m:limLow>`;
        }

        return funcName;
    }

    private parseDelimiter(type: string): string {
        // 跳过分隔符字符
        if (this.pos < this.tex.length) {
            const delim = this.tex[this.pos];
            this.pos++;
            if (delim === '(' || delim === ')' || delim === '[' || delim === ']' || delim === '|') {
                return `<m:r><m:t>${delim}</m:t></m:r>`;
            } else if (delim === '\\') {
                // \{ 或 \}
                const next = this.tex[this.pos];
                this.pos++;
                if (next === '{') return `<m:r><m:t>{</m:t></m:r>`;
                if (next === '}') return `<m:r><m:t>}</m:t></m:r>`;
            }
        }
        return '';
    }

    private parseTextCommand(): string {
        const content = this.parseGroup();
        // text 内容去掉 m:r 包装的斜体样式
        return content.replace(/<m:sty m:val="p"\/>/g, '');
    }

    private parseAccent(accentChar: string): string {
        const content = this.parseGroup();
        // 使用 OMML 的 acc 元素
        return `<m:acc><m:accPr><m:chr m:val="${accentChar}"/></m:accPr><m:e>${content}</m:e></m:acc>`;
    }

    private parseMathStyle(style: string): string {
        const content = this.parseGroup();
        // 提取纯文本内容
        const text = content.replace(/<[^>]+>/g, '');

        // 转换为特殊字体字符
        const converted = this.convertToMathFont(text, style);
        return `<m:r><m:t>${escapeXml(converted)}</m:t></m:r>`;
    }

    private convertToMathFont(text: string, style: string): string {
        // Unicode 数学字母表
        const mathFonts: Record<string, Record<string, string>> = {
            'script': {
                'A': '𝒜', 'B': 'ℬ', 'C': '𝒞', 'D': '𝒟', 'E': 'ℰ', 'F': 'ℱ', 'G': '𝒢', 'H': 'ℋ',
                'I': 'ℐ', 'J': '𝒥', 'K': '𝒦', 'L': 'ℒ', 'M': 'ℳ', 'N': '𝒩', 'O': '𝒪', 'P': '𝒫',
                'Q': '𝒬', 'R': 'ℛ', 'S': '𝒮', 'T': '𝒯', 'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳',
                'Y': '𝒴', 'Z': '𝒵',
                'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': 'ℯ', 'f': '𝒻', 'g': 'ℊ', 'h': '𝒽',
                'i': '𝒾', 'j': '𝒿', 'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃', 'o': 'ℴ', 'p': '𝓅',
                'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉', 'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍',
                'y': '𝓎', 'z': '𝓏'
            },
            'double-struck': {
                'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ',
                'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ',
                'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏',
                'Y': '𝕐', 'Z': 'ℤ',
                '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡'
            },
            'fraktur': {
                'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊', 'H': 'ℌ',
                'I': 'ℑ', 'J': '𝔍', 'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑', 'O': '𝔒', 'P': '𝔓',
                'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗', 'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛',
                'Y': '𝔜', 'Z': 'ℨ',
                'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤', 'h': '𝔥',
                'i': '𝔦', 'j': '𝔧', 'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫', 'o': '𝔬', 'p': '𝔭',
                'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱', 'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵',
                'y': '𝔶', 'z': '𝔷'
            }
        };

        const fontMap = mathFonts[style] || {};
        return text.split('').map(c => fontMap[c] || c).join('');
    }

    private parseOperatorName(): string {
        const content = this.parseGroup();
        // 提取纯文本
        const text = content.replace(/<[^>]+>/g, '');
        return `<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${escapeXml(text)}</m:t></m:r>`;
    }

    private skipGroup(): void {
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }
        if (this.pos < this.tex.length && this.tex[this.pos] === '{') {
            this.pos++;
            let depth = 1;
            while (this.pos < this.tex.length && depth > 0) {
                if (this.tex[this.pos] === '{') depth++;
                else if (this.tex[this.pos] === '}') depth--;
                this.pos++;
            }
        }
    }

    private parseEnvironment(): string {
        // 获取环境名称
        const envName = this.getGroupContent();

        switch (envName) {
            case 'matrix':
                return this.parseMatrix('', '');
            case 'pmatrix':
                return this.parseMatrix('(', ')');
            case 'bmatrix':
                return this.parseMatrix('[', ']');
            case 'Bmatrix':
                return this.parseMatrix('{', '}');
            case 'vmatrix':
                return this.parseMatrix('|', '|');
            case 'Vmatrix':
                return this.parseMatrix('‖', '‖');
            case 'cases':
                return this.parseCases();
            default:
                return '';
        }
    }

    private getGroupContent(): string {
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }
        if (this.pos < this.tex.length && this.tex[this.pos] === '{') {
            this.pos++;
            let content = '';
            let depth = 1;
            while (this.pos < this.tex.length && depth > 0) {
                if (this.tex[this.pos] === '{') depth++;
                else if (this.tex[this.pos] === '}') depth--;
                if (depth > 0) {
                    content += this.tex[this.pos];
                }
                this.pos++;
            }
            return content.trim();
        }
        return '';
    }

    private parseMatrix(leftDelim: string, rightDelim: string): string {
        // 找到 \end{...} 之前的内容
        const startPos = this.pos;
        let content = '';
        let depth = 0;

        while (this.pos < this.tex.length) {
            if (this.tex.slice(this.pos, this.pos + 4) === '\\end') {
                break;
            }
            content += this.tex[this.pos];
            this.pos++;
        }

        // 跳过 \end{...}
        if (this.tex.slice(this.pos, this.pos + 4) === '\\end') {
            this.pos += 4;
            this.skipGroup();
        }

        // 解析矩阵内容：行用 \\ 分隔，列用 & 分隔
        const rows = content.split('\\\\').map(r => r.trim()).filter(r => r);

        let matrixOmml = '<m:m>';

        // 矩阵属性
        matrixOmml += '<m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="' + (rows[0]?.split('&').length || 1) + '"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>';

        for (const row of rows) {
            matrixOmml += '<m:mr>';
            const cells = row.split('&').map(c => c.trim());
            for (const cell of cells) {
                const converter = new LatexToOmml();
                const cellOmml = converter.convert(cell);
                matrixOmml += `<m:e>${cellOmml}</m:e>`;
            }
            matrixOmml += '</m:mr>';
        }

        matrixOmml += '</m:m>';

        // 如果有定界符，包装在 d 元素中
        if (leftDelim || rightDelim) {
            return `<m:d><m:dPr><m:begChr m:val="${escapeXml(leftDelim)}"/><m:endChr m:val="${escapeXml(rightDelim)}"/></m:dPr><m:e>${matrixOmml}</m:e></m:d>`;
        }

        return matrixOmml;
    }

    private parseCases(): string {
        // 找到 \end{cases} 之前的内容
        let content = '';

        while (this.pos < this.tex.length) {
            if (this.tex.slice(this.pos, this.pos + 4) === '\\end') {
                break;
            }
            content += this.tex[this.pos];
            this.pos++;
        }

        // 跳过 \end{cases}
        if (this.tex.slice(this.pos, this.pos + 4) === '\\end') {
            this.pos += 4;
            this.skipGroup();
        }

        // cases 使用左大括号
        const rows = content.split('\\\\').map(r => r.trim()).filter(r => r);

        let matrixOmml = '<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="2"/><m:mcJc m:val="left"/></m:mcPr></m:mc></m:mcs></m:mPr>';

        for (const row of rows) {
            matrixOmml += '<m:mr>';
            const cells = row.split('&').map(c => c.trim());
            for (const cell of cells) {
                const converter = new LatexToOmml();
                const cellOmml = converter.convert(cell);
                matrixOmml += `<m:e>${cellOmml}</m:e>`;
            }
            // 如果只有一个单元格，添加空单元格
            if (cells.length === 1) {
                matrixOmml += '<m:e></m:e>';
            }
            matrixOmml += '</m:mr>';
        }

        matrixOmml += '</m:m>';

        return `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>${matrixOmml}</m:e></m:d>`;
    }

    private parseGroup(): string {
        // 跳过空格
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        if (this.pos >= this.tex.length) return '';

        if (this.tex[this.pos] === '{') {
            this.pos++; // skip {
            let result = '';
            let depth = 1;
            const start = this.pos;

            while (this.pos < this.tex.length && depth > 0) {
                if (this.tex[this.pos] === '{') depth++;
                else if (this.tex[this.pos] === '}') depth--;
                if (depth > 0) this.pos++;
            }

            const inner = this.tex.slice(start, this.pos);
            this.pos++; // skip }

            // 递归解析内部内容
            const converter = new LatexToOmml();
            return converter.convert(inner);
        } else {
            // 单个字符
            const ch = this.tex[this.pos];
            this.pos++;
            if (ch === '\\') {
                this.pos--;
                return this.parseCommand();
            }
            return `<m:r><m:t>${escapeXml(ch)}</m:t></m:r>`;
        }
    }

    private handleSuperscript(base: string): string {
        this.pos++; // skip ^
        const sup = this.parseGroup();

        // 检查是否紧跟下标
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        if (this.pos < this.tex.length && this.tex[this.pos] === '_') {
            this.pos++; // skip _
            const sub = this.parseGroup();
            // 上下标同时存在
            const lastElement = this.extractLastElement(base);
            return lastElement.prefix + `<m:sSubSup><m:e>${lastElement.element}</m:e><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup></m:sSubSup>`;
        }

        const lastElement = this.extractLastElement(base);
        return lastElement.prefix + `<m:sSup><m:e>${lastElement.element}</m:e><m:sup>${sup}</m:sup></m:sSup>`;
    }

    private handleSubscript(base: string): string {
        this.pos++; // skip _
        const sub = this.parseGroup();

        // 检查是否紧跟上标
        while (this.pos < this.tex.length && /\s/.test(this.tex[this.pos])) {
            this.pos++;
        }

        if (this.pos < this.tex.length && this.tex[this.pos] === '^') {
            this.pos++; // skip ^
            const sup = this.parseGroup();
            // 上下标同时存在
            const lastElement = this.extractLastElement(base);
            return lastElement.prefix + `<m:sSubSup><m:e>${lastElement.element}</m:e><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup></m:sSubSup>`;
        }

        const lastElement = this.extractLastElement(base);
        return lastElement.prefix + `<m:sSub><m:e>${lastElement.element}</m:e><m:sub>${sub}</m:sub></m:sSub>`;
    }

    private extractLastElement(omml: string): { prefix: string; element: string } {
        // 移除末尾空白
        omml = omml.replace(/\s+$/, '');
        if (!omml) return { prefix: '', element: '<m:r><m:t></m:t></m:r>' };

        // 匹配末尾的闭合标签
        const endTagMatch = omml.match(/<\/m:([a-zA-Z0-9]+)>$/);
        if (!endTagMatch) {
            // 如果没有找到闭合标签，说明可能不是标准的 OMML 结构，或者只是纯文本？
            // 为了安全，返回整个字符串作为 element
            return { prefix: '', element: omml };
        }

        const tagName = endTagMatch[1];

        // 查找匹配的开始标签（处理嵌套情况）
        // 为了性能和准确性，我们搜索所有的标签实例，然后通过计数平衡来找到通过对应的开始标签
        const pattern = new RegExp(`<\/?m:${tagName}(?:>|\\s[^>]*>)`, 'g');

        const matches: { tag: string, index: number }[] = [];
        let m;
        while ((m = pattern.exec(omml)) !== null) {
            matches.push({ tag: m[0], index: m.index });
        }

        // 从后向前扫描，寻找平衡点
        let balance = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            if (match.tag.startsWith('</')) {
                balance++;
            } else {
                balance--;
            }

            if (balance === 0) {
                // 找到了对应的开始标签
                return {
                    prefix: omml.substring(0, match.index),
                    element: omml.substring(match.index)
                };
            }
        }

        // 如果没找到平衡（理论上不应发生），返回整个字符串
        return { prefix: '', element: omml };
    }
}

// ============================================================================
// OMML 注入相关函数
// ============================================================================

/**
 * 公式信息接口
 */
interface MathFormulaInfo {
    placeholder: string;
    tex: string;
    isBlock: boolean;
}

/**
 * 生成唯一的数学公式占位符
 */
function generateMathPlaceholder(index: number): string {
    return `___MATH_${Date.now()}_${index}___`;
}

/**
 * 预处理 HTML，提取公式并替换为占位符
 * 返回处理后的 HTML 和公式信息列表
 */
function preprocessMathFormulas(html: string): {
    html: string;
    formulas: MathFormulaInfo[];
} {
    const formulas: MathFormulaInfo[] = [];
    let index = 0;
    let result = html;

    // 替换 $$...$$ (块级公式)
    // 如果公式在 <p> 标签内，替换整个 <p> 标签
    result = result.replace(/<p[^>]*>\s*\$\$([\s\S]+?)\$\$\s*<\/p>/gi, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: true });
        index++;
        return `<p style="text-align:center;margin:0;">${placeholder}</p>`;
    });
    // 处理不在 <p> 标签内的 $$...$$
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: true });
        index++;
        return `<p style="text-align:center;margin:0;">${placeholder}</p>`;
    });

    // 替换 \[...\] (块级公式)
    result = result.replace(/<p[^>]*>\s*\\\[([\s\S]+?)\\\]\s*<\/p>/gi, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: true });
        index++;
        return `<p style="text-align:center;margin:0;">${placeholder}</p>`;
    });
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: true });
        index++;
        return `<p style="text-align:center;margin:0;">${placeholder}</p>`;
    });

    // 替换 \(...\) (行内公式)
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: false });
        index++;
        return placeholder;
    });

    // 替换 $...$ (行内公式，需要在 $$ 之后处理)
    result = result.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, tex) => {
        const placeholder = generateMathPlaceholder(index);
        formulas.push({ placeholder, tex: tex.trim(), isBlock: false });
        index++;
        return placeholder;
    });

    return { html: result, formulas };
}


/**
 * 预定义的样式映射：CSS class -> 内联样式
 * 用于将 CSS class 转换为内联样式
 */
const CLASS_STYLE_MAP: Record<string, string> = {
    'p.title': 'font-family: 黑体, SimHei, sans-serif; font-size: 22pt; font-weight: bold; text-align: center; margin: 24pt 0; text-indent: 0;',
    'p.heading1': 'font-family: 黑体, SimHei, sans-serif; font-size: 16pt; font-weight: bold; text-align: left; margin: 16pt 0; text-indent: 0; mso-outline-level: 1;',
    'p.heading2': 'font-family: 黑体, SimHei, sans-serif; font-size: 14pt; font-weight: bold; text-align: left; margin: 12pt 0; text-indent: 0; mso-outline-level: 2;',
    'p.heading3': 'font-family: 黑体, SimHei, sans-serif; font-size: 12pt; font-weight: bold; text-align: left; margin: 10pt 0; text-indent: 0; mso-outline-level: 3;',
    'p': 'font-family: 宋体, SimSun, serif; font-size: 12pt; line-height: 150%; text-indent: 2em; mso-char-indent-count: 2; margin: 6pt 0;',
    'pre.code': 'font-family: Consolas, "Courier New", monospace; font-size: 10pt; background-color: #f5f5f5; padding: 12px; border: 1px solid #cccccc; white-space: pre-wrap; margin: 8pt 0;',
    'p.quote': 'border-left: 4px solid #667eea; padding-left: 16px; margin: 12px 0; color: #555; text-indent: 0;',
    'table': 'border-collapse: collapse; width: 100%; margin: 8pt 0;',
    'th, td': 'border: 1px solid #999; padding: 8px; font-family: 宋体; font-size: 12pt;',
    'th': 'background-color: #f0f0f0; font-weight: bold;',
    'ul, ol': 'margin: 8pt 0; padding-left: 24pt;',
    'li': 'margin: 4pt 0; font-family: 宋体; font-size: 12pt;',
};

/**
 * 将 CSS class 转换为内联样式
 * 使用 juice 进行 CSS 内联化，cheerio 删除 class 属性
 * @param html HTML 内容
 * @param cssStyles 可选的排版预设 CSS
 */
function applyInlineStyles(html: string, cssStyles?: string): string {
    // 0. 预处理 HTML：为所有无 class 的 <p> 标签添加临时 class="body-text"
    // 这样可以避免 p 选择器污染其他带 class 的 p 标签（如 title、heading 等）
    let preprocessedHtml = html.replace(/<p(\s+[^>]*)?>/gi, (match, attrs) => {
        // 如果已经有 class 属性，保持不变
        if (attrs && /class\s*=/i.test(attrs)) {
            return match;
        }
        // 否则添加临时 body-text class
        if (attrs) {
            return `<p${attrs} class="body-text">`;
        }
        return '<p class="body-text">';
    });

    // 1. 如果有排版预设 CSS，注入到 <style> 标签
    let htmlWithStyles = preprocessedHtml;
    if (cssStyles) {
        // 检查是否已有 <style> 标签
        if (/<style[^>]*>/i.test(htmlWithStyles)) {
            // 在现有 <style> 标签内追加
            htmlWithStyles = htmlWithStyles.replace(
                /(<style[^>]*>)/i,
                `$1\n${cssStyles}\n`
            );
        } else {
            // 添加新的 <style> 标签
            htmlWithStyles = `<style>${cssStyles}</style>${htmlWithStyles}`;
        }
    }

    // 2. 添加默认的 CLASS_STYLE_MAP 样式作为备用
    // 使用 selector { style } 格式，支持复杂的选择器如 p.title
    const defaultStyles = Object.entries(CLASS_STYLE_MAP)
        .map(([selector, style]) => `${selector} { ${style} }`)
        .join('\n');

    if (/<style[^>]*>/i.test(htmlWithStyles)) {
        htmlWithStyles = htmlWithStyles.replace(
            /(<style[^>]*>)/i,
            `$1\n${defaultStyles}\n`
        );
    } else {
        htmlWithStyles = `<style>${defaultStyles}</style>${htmlWithStyles}`;
    }

    // 3. 临时转换 CSS：将所有 <style> 标签内的 "p {" 替换为 "p.body-text {"
    // 这样可以让 p 选择器只匹配无 class 的段落（已被标记为 body-text）
    htmlWithStyles = htmlWithStyles.replace(
        /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
        (match, openTag, cssContent, closeTag) => {
            // 替换独立的 p 选择器（不是 p.xxx 或其他复合选择器）
            // 使用负向前瞻确保后面不是 . 或其他字符
            const transformedCss = cssContent.replace(
                /\bp\s*(?=\{)/g,
                'p.body-text '
            );
            return openTag + transformedCss + closeTag;
        }
    );

    // 4. 使用 juice 内联化 CSS
    let inlineHtml = juice(htmlWithStyles, {
        applyStyleTags: true,
        removeStyleTags: true,
        preserveMediaQueries: false,
        preserveFontFaces: false,
        preserveImportant: true,
        applyWidthAttributes: true,
        applyHeightAttributes: true,
        applyAttributesTableElements: true
    });

    // 5. 使用正则删除 class 属性（juice 内联后不再需要，包括临时添加的 body-text）
    inlineHtml = inlineHtml.replace(/\s+class="[^"]*"/gi, '');
    inlineHtml = inlineHtml.replace(/\s+class='[^']*'/gi, '');

    // 6. 清理 HTML 结构标签，只保留 body 内容
    inlineHtml = inlineHtml
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '');

    // 清理多余的空白和空行
    inlineHtml = inlineHtml.trim();

    // 调试：打印完整的内联 HTML
    console.log('[applyInlineStyles] 完整内联 HTML:\n', inlineHtml);
    return inlineHtml;
}

/**
 * 检测内容是否包含数学公式标记
 * 支持: $$...$$ (块级), $...$ (行内), \[...\], \(...\)
 */
export function containsMathFormula(html: string): boolean {
    return /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(html);
}



/**
 * 检测文本是否为 HTML 格式
 */
export function isHtmlFormat(text: string): boolean {
    const trimmed = text.trim();
    // 检查是否是被代码块包裹的 HTML
    if (trimmed.startsWith('```html') || (trimmed.startsWith('```') && /<[a-z][\s\S]*>/i.test(trimmed))) {
        return true;
    }
    // 检测常见的 HTML 标签
    return /<(h[1-6]|p|div|span|b|i|u|strong|em|ul|ol|li|table|br)\b[^>]*>/i.test(trimmed);
}

/**
 * 清理 HTML，移除不支持的标签，并尝试提取被 Markdown 包裹的内容
 */
export function sanitizeHtml(html: string): string {
    // 1. 尝试提取被 ```html ... ``` 包裹的内容
    let result = html.trim();
    const match = result.match(/^```html\s*([\s\S]*?)\s*```$/i) ||
        result.match(/^```\s*([\s\S]*?)\s*```$/i);
    if (match) {
        result = match[1].trim();
    }

    // 2. Word 支持的基本 HTML 标签
    // 移除 script、style 等不安全标签
    let clean = result
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<link\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*>/gi, '');

    return clean;
}

/**
 * 生成行内公式的完整 OOXML 包
 * m:oMath 直接放在 w:p 下（与 w:r 同级），避免段落分割
 */
function generateInlineMathOOXML(tex: string): string {
    const converter = new LatexToOmml();
    const omml = converter.convert(tex);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
  <pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512">
    <pkg:xmlData>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
    <pkg:xmlData>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <w:body>
          <w:p>
            <m:oMath>${omml}</m:oMath>
          </w:p>
        </w:body>
      </w:document>
    </pkg:xmlData>
  </pkg:part>
</pkg:package>`;
}

/**
 * 将 HTML 插入 Word 并替换公式占位符为原生 OMML 公式
 * @param context Word 请求上下文
 * @param html HTML 内容片段
 * @param cssStyles 可选的 CSS 样式（来自排版预设）
 */
export async function insertHtmlAsDocx(
    context: Word.RequestContext,
    html: string,
    cssStyles?: string
): Promise<void> {
    console.log('[insertHtmlAsDocx] 开始转换，HTML 长度:', html.length);

    // 1. 预处理：提取公式，替换为占位符
    const { html: processedHtml, formulas } = preprocessMathFormulas(html);
    console.log('[insertHtmlAsDocx] 提取到', formulas.length, '个公式');

    // 2. 将占位符替换为可搜索的标记文本
    let finalHtml = processedHtml;
    const formulaMarkers: Array<{ marker: string; tex: string; isBlock: boolean }> = [];
    for (let i = 0; i < formulas.length; i++) {
        const marker = `\u00ABformula${i}\u00BB`;
        formulaMarkers.push({ marker, tex: formulas[i].tex, isBlock: formulas[i].isBlock });
        finalHtml = finalHtml.replace(formulas[i].placeholder, marker);
    }

    // 3. 将 CSS class 转换为内联样式
    const styledHtml = applyInlineStyles(finalHtml, cssStyles);
    console.log('[insertHtmlAsDocx] 内联样式 HTML:\n', styledHtml.substring(0, 500));

    // 4. 添加牺牲段落（Word insertHtml 的 bug：最后一段会丢失样式）
    const sacrificeMarker = '\u00AB\u00ABSACRIFICE\u00BB\u00BB';
    const htmlWithSacrifice = styledHtml + `<p>${sacrificeMarker}</p>`;

    // 5. 使用 insertHtml 插入
    const selection = context.document.getSelection();
    selection.insertHtml(htmlWithSacrifice, Word.InsertLocation.after);
    await context.sync();
    console.log('[insertHtmlAsDocx] HTML 插入成功');

    // 6. 删除牺牲段落
    const sacrificeResults = context.document.body.search(sacrificeMarker, { matchCase: true, matchWholeWord: false });
    sacrificeResults.load('items');
    await context.sync();
    if (sacrificeResults.items.length > 0) {
        // 删除包含标记的整个段落
        const sacrificePara = sacrificeResults.items[0].paragraphs.getFirst();
        sacrificePara.delete();
        await context.sync();
        console.log('[insertHtmlAsDocx] 牺牲段落已删除');
    }

    // 7. 搜索标记文本并替换为 OMML 公式
    if (formulaMarkers.length > 0) {
        const settings = getSettings();
        const mathFont = settings.mathFormulaFont;
        const mathFontSize = getFontSizeValue(settings.mathFormulaFontSize);

        // BATCH 1: Execute all searches in one go
        // Define a type for our batch items
        interface BatchItem {
            marker: string;
            tex: string;
            searchResults: Word.RangeCollection;
        }

        const batchItems: BatchItem[] = [];

        // Queue up all search commands
        for (const { marker, tex } of formulaMarkers) {
            // Note: We don't need await context.sync() inside this loop!
            const searchResults = context.document.body.search(marker, { matchCase: true, matchWholeWord: false });
            searchResults.load('items');
            batchItems.push({ marker, tex, searchResults });
        }

        // Sync ONCE to execute all searches and load results
        await context.sync();
        console.log('[insertHtmlAsDocx] 批量搜索完成');

        // BATCH 2: Process results and queue up inserts
        for (const item of batchItems) {
            if (item.searchResults.items.length > 0) {
                // We only replace the first occurrence (since markers are unique)
                // If there were somehow duplicates, we might want to handle them, but unique IDs prevent that.
                const range = item.searchResults.items[0];

                console.log('[insertHtmlAsDocx] 替换公式:', item.marker, '→', item.tex.substring(0, 30));

                const ooxml = generateInlineMathOOXML(item.tex);
                const insertedRange = range.insertOoxml(ooxml, Word.InsertLocation.replace);

                // Queue font updates
                try {
                    // Note: These property sets are "queued" commands in Office.js
                    insertedRange.font.name = mathFont;
                    insertedRange.font.size = mathFontSize;
                } catch (e) {
                    console.warn('[insertHtmlAsDocx] 设置公式字体失败:', e);
                }
            } else {
                console.warn('[insertHtmlAsDocx] 未找到标记:', item.marker);
            }
        }

        // Sync ONCE to execute all insertions and formatting changes
        await context.sync();
        console.log('[insertHtmlAsDocx] 批量替换完成');
    }

    console.log('[insertHtmlAsDocx] 全部完成');
}