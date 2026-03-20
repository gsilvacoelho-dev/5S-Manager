from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='auditor')  # 'admin' ou 'auditor'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relacionamentos
    evaluations = db.relationship('Evaluation', backref='auditor', lazy=True)
    assigned_areas = db.relationship('AreaAssignment', backref='auditor', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.user_type == 'admin'
    
    def is_auditor(self):
        return self.user_type == 'auditor'

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'user_type': self.user_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Area(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relacionamentos
    evaluations = db.relationship('Evaluation', backref='area', lazy=True)
    assignments = db.relationship('AreaAssignment', backref='area', lazy=True)
    ranking_history = db.relationship('RankingHistory', backref='area', lazy=True)


    def __repr__(self):
        return f'<Area {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Cycle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    evaluations = db.relationship('Evaluation', backref='cycle', lazy=True)
    assignments = db.relationship('AreaAssignment', backref='cycle', lazy=True)
    ranking_history = db.relationship('RankingHistory', backref='cycle', lazy=True)


    def __repr__(self):
        return f'<Cycle {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AreaAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('area.id'), nullable=False)
    auditor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cycle_id = db.Column(db.Integer, db.ForeignKey('cycle.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<AreaAssignment Area:{self.area_id} Auditor:{self.auditor_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'auditor_id': self.auditor_id,
            'cycle_id': self.cycle_id,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None
        }

class Evaluation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    area_id = db.Column(db.Integer, db.ForeignKey('area.id'), nullable=False)
    auditor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cycle_id = db.Column(db.Integer, db.ForeignKey('cycle.id'), nullable=False)
    
    # Notas dos 5 sensos (1-5)
    senso1_score = db.Column(db.Integer, nullable=False)  # Seiri (Utilização)
    senso1_justification = db.Column(db.Text, nullable=False)
    
    senso2_score = db.Column(db.Integer, nullable=False)  # Seiton (Organização)
    senso2_justification = db.Column(db.Text, nullable=False)
    
    senso3_score = db.Column(db.Integer, nullable=False)  # Seiso (Limpeza)
    senso3_justification = db.Column(db.Text, nullable=False)
    
    senso4_score = db.Column(db.Integer, nullable=False)  # Seiketsu (Padronização)
    senso4_justification = db.Column(db.Text, nullable=False)
    
    senso5_score = db.Column(db.Integer, nullable=False)  # Shitsuke (Disciplina)
    senso5_justification = db.Column(db.Text, nullable=False)
    
    total_score = db.Column(db.Float, nullable=False)  # Média dos 5 sensos
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def calculate_total_score(self):
        self.total_score = (self.senso1_score + self.senso2_score + self.senso3_score + 
                           self.senso4_score + self.senso5_score) / 5.0

    def __repr__(self):
        return f'<Evaluation Area:{self.area_id} Score:{self.total_score}>'

    def to_dict(self):
        return {
            'id': self.id,
            'area_id': self.area_id,
            'auditor_id': self.auditor_id,
            'cycle_id': self.cycle_id,
            'senso1_score': self.senso1_score,
            'senso1_justification': self.senso1_justification,
            'senso2_score': self.senso2_score,
            'senso2_justification': self.senso2_justification,
            'senso3_score': self.senso3_score,
            'senso3_justification': self.senso3_justification,
            'senso4_score': self.senso4_score,
            'senso4_justification': self.senso4_justification,
            'senso5_score': self.senso5_score,
            'senso5_justification': self.senso5_justification,
            'total_score': self.total_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RankingHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cycle_id = db.Column(db.Integer, db.ForeignKey('cycle.id'), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('area.id'), nullable=False)
    area_name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    total_score = db.Column(db.Float, nullable=False)
    auditor_name = db.Column(db.String(80), nullable=False)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluation.id'), nullable=False)
    senso1_score = db.Column(db.Integer, nullable=False)
    senso2_score = db.Column(db.Integer, nullable=False)
    senso3_score = db.Column(db.Integer, nullable=False)
    senso4_score = db.Column(db.Integer, nullable=False)
    senso5_score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    evaluation = db.relationship('Evaluation', backref=db.backref('ranking_history', uselist=False))

    def __repr__(self):
        return f'<RankingHistory Cycle:{self.cycle_id} Area:{self.area_name} Position:{self.position}>'

    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'area_id': self.area_id,
            'area_name': self.area_name,
            'position': self.position,
            'total_score': self.total_score,
            'auditor_name': self.auditor_name,
            'evaluation_id': self.evaluation_id,
            'senso_scores': {
                'seiri': self.senso1_score,
                'seiton': self.senso2_score,
                'seiso': self.senso3_score,
                'seiketsu': self.senso4_score,
                'shitsuke': self.senso5_score
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }